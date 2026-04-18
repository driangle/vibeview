import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { createElement } from 'react';
import { SWRConfig } from 'swr';
import { useProjects } from './useProjects';
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

describe('useProjects localStorage migration', () => {
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
