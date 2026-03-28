import { useCallback } from 'react';
import { useLocalStorage } from './useLocalStorage';
import type { Project } from '../types';

export interface UseProjectsReturn {
  projects: Project[];
  createProject: (input: Omit<Project, 'id'>) => Project;
  updateProject: (id: string, updates: Partial<Omit<Project, 'id'>>) => void;
  deleteProject: (id: string) => void;
}

export class DuplicateProjectNameError extends Error {
  constructor(name: string) {
    super(`A project named "${name}" already exists`);
    this.name = 'DuplicateProjectNameError';
  }
}

export function useProjects(): UseProjectsReturn {
  const [projects, setProjects] = useLocalStorage<Project[]>('projects', []);

  const createProject = useCallback(
    (input: Omit<Project, 'id'>): Project => {
      const duplicate = projects.find((p) => p.name.toLowerCase() === input.name.toLowerCase());
      if (duplicate) {
        throw new DuplicateProjectNameError(input.name);
      }

      const project: Project = { ...input, id: crypto.randomUUID() };
      setProjects((prev) => [...prev, project]);
      return project;
    },
    [projects, setProjects],
  );

  const updateProject = useCallback(
    (id: string, updates: Partial<Omit<Project, 'id'>>) => {
      if (updates.name !== undefined) {
        const duplicate = projects.find(
          (p) => p.id !== id && p.name.toLowerCase() === updates.name!.toLowerCase(),
        );
        if (duplicate) {
          throw new DuplicateProjectNameError(updates.name!);
        }
      }

      setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)));
    },
    [projects, setProjects],
  );

  const deleteProject = useCallback(
    (id: string) => {
      setProjects((prev) => prev.filter((p) => p.id !== id));
    },
    [setProjects],
  );

  return { projects, createProject, updateProject, deleteProject };
}
