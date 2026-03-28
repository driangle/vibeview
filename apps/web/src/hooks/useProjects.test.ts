import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useProjects, DuplicateProjectNameError } from './useProjects';
import type { Project } from '../types';

const STORAGE_KEY = 'vibeview:projects';

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal(
    'crypto',
    Object.assign({}, crypto, {
      randomUUID: vi.fn(() => 'test-uuid-1'),
    }),
  );
});

function makeProject(overrides: Partial<Project> = {}): Omit<Project, 'id'> {
  return {
    name: 'My Project',
    folderPaths: ['/home/user/project'],
    ...overrides,
  };
}

describe('useProjects', () => {
  describe('initial state', () => {
    it('returns an empty array when localStorage is empty', () => {
      const { result } = renderHook(() => useProjects());
      expect(result.current.projects).toEqual([]);
    });

    it('loads existing projects from localStorage', () => {
      const existing: Project[] = [{ id: '1', name: 'Existing', folderPaths: ['/path'] }];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));

      const { result } = renderHook(() => useProjects());
      expect(result.current.projects).toEqual(existing);
    });
  });

  describe('createProject', () => {
    it('creates a project with a generated id', () => {
      const { result } = renderHook(() => useProjects());

      let created: Project;
      act(() => {
        created = result.current.createProject(makeProject());
      });

      expect(created!.id).toBe('test-uuid-1');
      expect(created!.name).toBe('My Project');
      expect(result.current.projects).toHaveLength(1);
      expect(result.current.projects[0]).toEqual(created!);
    });

    it('persists to localStorage', () => {
      const { result } = renderHook(() => useProjects());

      act(() => {
        result.current.createProject(makeProject());
      });

      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
      expect(stored).toHaveLength(1);
      expect(stored[0].name).toBe('My Project');
    });

    it('includes optional description and color', () => {
      const { result } = renderHook(() => useProjects());

      act(() => {
        result.current.createProject(
          makeProject({ description: 'A description', color: '#ff0000' }),
        );
      });

      expect(result.current.projects[0].description).toBe('A description');
      expect(result.current.projects[0].color).toBe('#ff0000');
    });

    it('throws on duplicate name (case-insensitive)', () => {
      const { result } = renderHook(() => useProjects());

      act(() => {
        result.current.createProject(makeProject({ name: 'Alpha' }));
      });

      expect(() => {
        act(() => {
          result.current.createProject(makeProject({ name: 'alpha' }));
        });
      }).toThrow(DuplicateProjectNameError);
    });
  });

  describe('updateProject', () => {
    it('updates project fields', () => {
      const { result } = renderHook(() => useProjects());

      act(() => {
        result.current.createProject(makeProject());
      });

      act(() => {
        result.current.updateProject('test-uuid-1', { name: 'Renamed' });
      });

      expect(result.current.projects[0].name).toBe('Renamed');
    });

    it('persists updates to localStorage', () => {
      const { result } = renderHook(() => useProjects());

      act(() => {
        result.current.createProject(makeProject());
      });

      act(() => {
        result.current.updateProject('test-uuid-1', {
          folderPaths: ['/new/path'],
        });
      });

      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
      expect(stored[0].folderPaths).toEqual(['/new/path']);
    });

    it('throws when renaming to an existing name', () => {
      const { result } = renderHook(() => useProjects());
      let counter = 0;
      vi.mocked(crypto.randomUUID).mockImplementation(
        () => `${++counter}-0000-0000-0000-000000000000` as ReturnType<typeof crypto.randomUUID>,
      );

      act(() => {
        result.current.createProject(makeProject({ name: 'Alpha' }));
      });
      act(() => {
        result.current.createProject(makeProject({ name: 'Beta' }));
      });

      expect(() => {
        act(() => {
          result.current.updateProject('2-0000-0000-0000-000000000000', { name: 'Alpha' });
        });
      }).toThrow(DuplicateProjectNameError);
    });

    it('allows renaming a project to its own name', () => {
      const { result } = renderHook(() => useProjects());

      act(() => {
        result.current.createProject(makeProject({ name: 'Same' }));
      });

      act(() => {
        result.current.updateProject('test-uuid-1', { name: 'Same' });
      });

      expect(result.current.projects[0].name).toBe('Same');
    });
  });

  describe('deleteProject', () => {
    it('removes a project by id', () => {
      const { result } = renderHook(() => useProjects());

      act(() => {
        result.current.createProject(makeProject());
      });

      expect(result.current.projects).toHaveLength(1);

      act(() => {
        result.current.deleteProject('test-uuid-1');
      });

      expect(result.current.projects).toHaveLength(0);
    });

    it('persists deletion to localStorage', () => {
      const { result } = renderHook(() => useProjects());

      act(() => {
        result.current.createProject(makeProject());
      });

      act(() => {
        result.current.deleteProject('test-uuid-1');
      });

      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
      expect(stored).toHaveLength(0);
    });

    it('does not affect other projects', () => {
      const { result } = renderHook(() => useProjects());
      let counter = 0;
      vi.mocked(crypto.randomUUID).mockImplementation(
        () => `${++counter}-0000-0000-0000-000000000000` as ReturnType<typeof crypto.randomUUID>,
      );

      act(() => {
        result.current.createProject(makeProject({ name: 'Keep' }));
      });
      act(() => {
        result.current.createProject(makeProject({ name: 'Remove' }));
      });

      act(() => {
        result.current.deleteProject('2-0000-0000-0000-000000000000');
      });

      expect(result.current.projects).toHaveLength(1);
      expect(result.current.projects[0].name).toBe('Keep');
    });
  });

  describe('localStorage persistence', () => {
    it('survives re-render (simulating page reload)', () => {
      const { result, unmount } = renderHook(() => useProjects());

      act(() => {
        result.current.createProject(makeProject({ name: 'Persistent' }));
      });

      unmount();

      const { result: result2 } = renderHook(() => useProjects());
      expect(result2.current.projects).toHaveLength(1);
      expect(result2.current.projects[0].name).toBe('Persistent');
    });
  });
});
