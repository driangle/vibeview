import { useProjectsContext } from '../contexts/useProjectsContext';
import type { ProjectsContextValue } from '../contexts/useProjectsContext';

export { DuplicateProjectNameError } from '../contexts/ProjectsContext';

export type UseProjectsReturn = Pick<
  ProjectsContextValue,
  'projects' | 'createProject' | 'updateProject' | 'deleteProject'
>;

export function useProjects(): UseProjectsReturn {
  const { projects, createProject, updateProject, deleteProject } = useProjectsContext();
  return { projects, createProject, updateProject, deleteProject };
}
