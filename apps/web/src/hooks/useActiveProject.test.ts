import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createElement } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { SWRConfig } from 'swr';
import { useActiveProject } from './useActiveProject';
import { ProjectsProvider } from '../contexts/ProjectsContext';
import type { Project } from '../types';

let mockProjects: Project[] = [];

beforeEach(() => {
  mockProjects = [
    { id: 'proj-1', name: 'Project A', folderPaths: ['/path/a'] },
    { id: 'proj-2', name: 'Project B', folderPaths: ['/path/b', '/path/c'] },
  ];
  localStorage.clear();

  vi.stubGlobal(
    'fetch',
    vi.fn((url: string) => {
      if (url === '/api/projects') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockProjects),
        });
      }
      return Promise.resolve({ ok: false, status: 404, statusText: 'Not Found' });
    }),
  );
});

function wrapper(initialEntry = '/') {
  return ({ children }: { children: React.ReactNode }) =>
    createElement(
      MemoryRouter,
      { initialEntries: [initialEntry] },
      createElement(
        SWRConfig,
        { value: { dedupingInterval: 0, provider: () => new Map() } },
        createElement(ProjectsProvider, null, children),
      ),
    );
}

describe('useActiveProject', () => {
  it('returns no active project when URL has no project param', async () => {
    const { result } = renderHook(() => useActiveProject(), { wrapper: wrapper('/') });
    await waitFor(() => expect(result.current.activeProjectId).toBe(''));
    expect(result.current.activeProject).toBeNull();
  });

  it('resolves the active project from URL param', async () => {
    const { result } = renderHook(() => useActiveProject(), {
      wrapper: wrapper('/?project=proj-1'),
    });
    await waitFor(() => expect(result.current.activeProject).not.toBeNull());
    expect(result.current.activeProjectId).toBe('proj-1');
    expect(result.current.activeProject!.name).toBe('Project A');
  });

  it('returns null for unknown project ID', async () => {
    const { result } = renderHook(() => useActiveProject(), {
      wrapper: wrapper('/?project=nonexistent'),
    });
    await waitFor(() => expect(result.current.activeProjectId).toBe('nonexistent'));
    expect(result.current.activeProject).toBeNull();
  });

  it('setActiveProject updates the project param', async () => {
    const { result } = renderHook(() => useActiveProject(), { wrapper: wrapper('/') });
    await waitFor(() => expect(result.current.activeProjectId).toBe(''));

    act(() => {
      result.current.setActiveProject('proj-2');
    });

    expect(result.current.activeProjectId).toBe('proj-2');
    expect(result.current.activeProject!.name).toBe('Project B');
  });

  it('setActiveProject with empty string clears the param', async () => {
    const { result } = renderHook(() => useActiveProject(), {
      wrapper: wrapper('/?project=proj-1'),
    });
    await waitFor(() => expect(result.current.activeProjectId).toBe('proj-1'));

    act(() => {
      result.current.setActiveProject('');
    });

    expect(result.current.activeProjectId).toBe('');
    expect(result.current.activeProject).toBeNull();
  });
});
