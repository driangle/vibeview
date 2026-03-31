import { useCallback, useEffect, useRef, useState } from 'react';
import useSWR from 'swr';
import { fetcher, withToken } from '../api';
import type { Project } from '../types';
import { DuplicateProjectNameError, findDuplicate } from './projectErrors';
import { ProjectsContext } from './useProjectsContext';

const LEGACY_STORAGE_KEY = 'vibeview:projects';

export function ProjectsProvider({ children }: { children: React.ReactNode }) {
  const { data, mutate } = useSWR<Project[]>('/api/projects', fetcher);
  const [optimistic, setOptimistic] = useState<Project[] | null>(null);
  const migrated = useRef(false);

  const projects: Project[] = optimistic ?? data ?? [];

  // One-time migration from localStorage to backend.
  useEffect(() => {
    if (!data || migrated.current) return;
    migrated.current = true;

    const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return;

    let local: Project[];
    try {
      local = JSON.parse(raw);
    } catch {
      return;
    }
    if (!Array.isArray(local) || local.length === 0) return;

    // Merge: add localStorage projects whose IDs don't exist on the server.
    const serverIds = new Set(data.map((p) => p.id));
    const toAdd = local.filter((p) => !serverIds.has(p.id));
    if (toAdd.length === 0) {
      localStorage.removeItem(LEGACY_STORAGE_KEY);
      return;
    }

    const merged = [...data, ...toAdd];
    syncToServer(merged);
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  }, [data]); // eslint-disable-line react-hooks/exhaustive-deps

  const syncToServer = useCallback(
    async (list: Project[]) => {
      setOptimistic(list);
      try {
        const res = await fetch(withToken('/api/projects'), {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(list),
        });
        if (res.ok) {
          const updated = await res.json();
          mutate(updated, false);
        }
      } finally {
        setOptimistic(null);
      }
    },
    [mutate],
  );

  const createProject = useCallback(
    (input: Omit<Project, 'id'>): Project => {
      if (findDuplicate(projects, input.name)) {
        throw new DuplicateProjectNameError(input.name);
      }
      const project: Project = { ...input, id: crypto.randomUUID() };
      syncToServer([...projects, project]);
      return project;
    },
    [projects, syncToServer],
  );

  const updateProject = useCallback(
    (id: string, updates: Partial<Omit<Project, 'id'>>) => {
      if (updates.name !== undefined && findDuplicate(projects, updates.name, id)) {
        throw new DuplicateProjectNameError(updates.name);
      }
      syncToServer(projects.map((p) => (p.id === id ? { ...p, ...updates } : p)));
    },
    [projects, syncToServer],
  );

  const deleteProject = useCallback(
    (id: string) => {
      syncToServer(projects.filter((p) => p.id !== id));
    },
    [projects, syncToServer],
  );

  return (
    <ProjectsContext.Provider
      value={{ projects, isLoaded: !!data, createProject, updateProject, deleteProject }}
    >
      {children}
    </ProjectsContext.Provider>
  );
}
