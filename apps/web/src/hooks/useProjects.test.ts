import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { createElement } from 'react';
import { SWRConfig } from 'swr';
import { useProjects, DuplicateProjectNameError } from './useProjects';
import { ProjectsProvider } from '../contexts/ProjectsContext';
import type { Project } from '../types';

let mockProjects: Project[] = [];
let putBody: Project[] | null = null;

beforeEach(() => {
  mockProjects = [];
  putBody = null;
  localStorage.clear();

  vi.stubGlobal(
    'crypto',
    Object.assign({}, crypto, {
      randomUUID: vi.fn(() => 'test-uuid-1'),
    }),
  );

  vi.stubGlobal(
    'fetch',
    vi.fn((url: string, init?: RequestInit) => {
      if (url === '/api/projects' && (!init || init.method !== 'PUT')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockProjects),
        });
      }
      if (url === '/api/projects' && init?.method === 'PUT') {
        putBody = JSON.parse(init.body as string);
        // Update mockProjects so subsequent GETs return updated data.
        mockProjects = putBody!;
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(putBody),
        });
      }
      return Promise.resolve({ ok: false, status: 404, statusText: 'Not Found' });
    }),
  );
});

function wrapper({ children }: { children: React.ReactNode }) {
  return createElement(
    SWRConfig,
    { value: { dedupingInterval: 0, provider: () => new Map() } },
    createElement(ProjectsProvider, null, children),
  );
}

describe('useProjects', () => {
  describe('initial state', () => {
    it('returns an empty array when server has no projects', async () => {
      const { result } = renderHook(() => useProjects(), { wrapper });
      await waitFor(() => expect(result.current.projects).toEqual([]));
    });

    it('loads existing projects from server', async () => {
      mockProjects = [{ id: '1', name: 'Existing', folderPaths: ['/path'] }];
      const { result } = renderHook(() => useProjects(), { wrapper });
      await waitFor(() => expect(result.current.projects).toEqual(mockProjects));
    });
  });

  describe('createProject', () => {
    it('creates a project with a generated id', async () => {
      const { result } = renderHook(() => useProjects(), { wrapper });
      await waitFor(() => expect(result.current.projects).toEqual([]));

      let created: Project;
      act(() => {
        created = result.current.createProject({
          name: 'My Project',
          folderPaths: ['/home/user/project'],
        });
      });

      expect(created!.id).toBe('test-uuid-1');
      expect(created!.name).toBe('My Project');
      expect(putBody).toHaveLength(1);
      expect(putBody![0].name).toBe('My Project');
    });

    it('includes optional description and color', async () => {
      const { result } = renderHook(() => useProjects(), { wrapper });
      await waitFor(() => expect(result.current.projects).toEqual([]));

      act(() => {
        result.current.createProject({
          name: 'My Project',
          folderPaths: ['/path'],
          description: 'A description',
          color: '#ff0000',
        });
      });

      expect(putBody![0].description).toBe('A description');
      expect(putBody![0].color).toBe('#ff0000');
    });

    it('throws on duplicate name (case-insensitive)', async () => {
      mockProjects = [{ id: '1', name: 'Alpha', folderPaths: ['/a'] }];
      const { result } = renderHook(() => useProjects(), { wrapper });
      await waitFor(() => expect(result.current.projects).toHaveLength(1));

      expect(() => {
        act(() => {
          result.current.createProject({ name: 'alpha', folderPaths: ['/b'] });
        });
      }).toThrow(DuplicateProjectNameError);
    });
  });

  describe('updateProject', () => {
    it('updates project fields', async () => {
      mockProjects = [{ id: '1', name: 'Original', folderPaths: ['/path'] }];
      const { result } = renderHook(() => useProjects(), { wrapper });
      await waitFor(() => expect(result.current.projects).toHaveLength(1));

      act(() => {
        result.current.updateProject('1', { name: 'Renamed' });
      });

      expect(putBody![0].name).toBe('Renamed');
    });

    it('throws when renaming to an existing name', async () => {
      mockProjects = [
        { id: '1', name: 'Alpha', folderPaths: ['/a'] },
        { id: '2', name: 'Beta', folderPaths: ['/b'] },
      ];
      const { result } = renderHook(() => useProjects(), { wrapper });
      await waitFor(() => expect(result.current.projects).toHaveLength(2));

      expect(() => {
        act(() => {
          result.current.updateProject('2', { name: 'Alpha' });
        });
      }).toThrow(DuplicateProjectNameError);
    });

    it('allows renaming a project to its own name', async () => {
      mockProjects = [{ id: '1', name: 'Same', folderPaths: ['/a'] }];
      const { result } = renderHook(() => useProjects(), { wrapper });
      await waitFor(() => expect(result.current.projects).toHaveLength(1));

      act(() => {
        result.current.updateProject('1', { name: 'Same' });
      });

      expect(putBody![0].name).toBe('Same');
    });
  });

  describe('deleteProject', () => {
    it('removes a project by id', async () => {
      mockProjects = [{ id: '1', name: 'Delete Me', folderPaths: ['/path'] }];
      const { result } = renderHook(() => useProjects(), { wrapper });
      await waitFor(() => expect(result.current.projects).toHaveLength(1));

      act(() => {
        result.current.deleteProject('1');
      });

      expect(putBody).toHaveLength(0);
    });

    it('does not affect other projects', async () => {
      mockProjects = [
        { id: '1', name: 'Keep', folderPaths: ['/a'] },
        { id: '2', name: 'Remove', folderPaths: ['/b'] },
      ];
      const { result } = renderHook(() => useProjects(), { wrapper });
      await waitFor(() => expect(result.current.projects).toHaveLength(2));

      act(() => {
        result.current.deleteProject('2');
      });

      expect(putBody).toHaveLength(1);
      expect(putBody![0].name).toBe('Keep');
    });
  });

  describe('localStorage migration', () => {
    it('migrates localStorage projects to backend on first load', async () => {
      const local: Project[] = [{ id: 'local-1', name: 'From LS', folderPaths: ['/ls'] }];
      localStorage.setItem('vibeview:projects', JSON.stringify(local));

      renderHook(() => useProjects(), { wrapper });
      await waitFor(() => {
        expect(putBody).not.toBeNull();
      });

      expect(putBody).toHaveLength(1);
      expect(putBody![0].name).toBe('From LS');
      expect(localStorage.getItem('vibeview:projects')).toBeNull();
    });

    it('merges localStorage projects with server projects', async () => {
      mockProjects = [{ id: 'server-1', name: 'Server', folderPaths: ['/s'] }];
      const local: Project[] = [{ id: 'local-1', name: 'Local', folderPaths: ['/l'] }];
      localStorage.setItem('vibeview:projects', JSON.stringify(local));

      renderHook(() => useProjects(), { wrapper });
      await waitFor(() => {
        expect(putBody).not.toBeNull();
      });

      expect(putBody).toHaveLength(2);
      expect(putBody!.find((p) => p.name === 'Server')).toBeTruthy();
      expect(putBody!.find((p) => p.name === 'Local')).toBeTruthy();
    });

    it('skips migration when localStorage has same IDs as server', async () => {
      mockProjects = [{ id: 'same-id', name: 'Already There', folderPaths: ['/s'] }];
      const local: Project[] = [{ id: 'same-id', name: 'Old Name', folderPaths: ['/l'] }];
      localStorage.setItem('vibeview:projects', JSON.stringify(local));

      renderHook(() => useProjects(), { wrapper });
      await waitFor(() => {
        expect(localStorage.getItem('vibeview:projects')).toBeNull();
      });

      // PUT should NOT have been called since all IDs already exist on server.
      const putCalls = (fetch as Mock).mock.calls.filter(
        (call) => (call[1] as RequestInit | undefined)?.method === 'PUT',
      );
      expect(putCalls).toHaveLength(0);
    });
  });
});
