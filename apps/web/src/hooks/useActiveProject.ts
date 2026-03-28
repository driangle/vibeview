import { useSearchParams } from 'react-router-dom';
import { useProjects } from './useProjects';

export function useActiveProject() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { projects } = useProjects();

  const activeProjectId = searchParams.get('project') || '';
  const activeProject = projects.find((p) => p.id === activeProjectId) ?? null;

  function setActiveProject(id: string) {
    setSearchParams((prev) => {
      if (id) {
        prev.set('project', id);
      } else {
        prev.delete('project');
      }
      prev.delete('page');
      return prev;
    });
  }

  return { activeProjectId, activeProject, setActiveProject };
}
