import { createContext, useContext } from 'react';
import type { Project } from '../types';

export interface ProjectsContextValue {
  projects: Project[];
  isLoaded: boolean;
  createProject: (input: Omit<Project, 'id'>) => Project;
  updateProject: (id: string, updates: Partial<Omit<Project, 'id'>>) => void;
  deleteProject: (id: string) => void;
}

export const ProjectsContext = createContext<ProjectsContextValue>({
  projects: [],
  isLoaded: false,
  createProject: () => {
    throw new Error('ProjectsProvider not mounted');
  },
  updateProject: () => {
    throw new Error('ProjectsProvider not mounted');
  },
  deleteProject: () => {
    throw new Error('ProjectsProvider not mounted');
  },
});

export function useProjectsContext() {
  return useContext(ProjectsContext);
}
