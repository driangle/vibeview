import { useState } from 'react';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Footer } from '../components/Footer';
import { ProjectDialog } from '../components/ProjectDialog';
import { DuplicateProjectNameError, useProjects } from '../hooks/useProjects';
import type { Project } from '../types';

export function ProjectList() {
  const { projects, createProject, updateProject, deleteProject } = useProjects();
  const [dialogMode, setDialogMode] = useState<'create' | 'edit' | null>(null);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [deletingProject, setDeletingProject] = useState<Project | null>(null);
  const [dialogError, setDialogError] = useState<string | null>(null);

  function openCreate() {
    setDialogMode('create');
    setEditingProject(null);
    setDialogError(null);
  }

  function openEdit(project: Project) {
    setDialogMode('edit');
    setEditingProject(project);
    setDialogError(null);
  }

  function closeDialog() {
    setDialogMode(null);
    setEditingProject(null);
    setDialogError(null);
  }

  function handleSave(input: Omit<Project, 'id'>) {
    try {
      if (dialogMode === 'edit' && editingProject) {
        updateProject(editingProject.id, input);
      } else {
        createProject(input);
      }
      closeDialog();
    } catch (err) {
      if (err instanceof DuplicateProjectNameError) {
        setDialogError(err.message);
      } else {
        throw err;
      }
    }
  }

  function handleDelete() {
    if (deletingProject) {
      deleteProject(deletingProject.id);
      setDeletingProject(null);
    }
  }

  return (
    <div className="mx-auto max-w-2xl p-4 sm:p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold text-fg">Projects</h1>
            {projects.length > 0 && (
              <span className="text-sm text-muted-fg">{projects.length}</span>
            )}
          </div>
          <p className="mt-1 text-sm text-muted-fg">
            Group related directories together to filter sessions across your workspace.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="shrink-0 whitespace-nowrap rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-fg transition-colors hover:bg-primary/90"
        >
          New Project
        </button>
      </div>

      {projects.length === 0 ? (
        <p className="text-sm text-muted-fg">
          No projects yet. Create one to group related directories.
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border bg-card">
          {projects.map((project) => (
            <li key={project.id} className="flex items-center gap-3 px-4 py-3">
              <span
                className="h-3 w-3 shrink-0 rounded-full"
                style={{ backgroundColor: project.color ?? '#6366f1' }}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-fg">{project.name}</p>
                {project.description && (
                  <p className="truncate text-xs text-muted-fg">{project.description}</p>
                )}
              </div>
              <span className="shrink-0 text-xs text-muted-fg">
                {project.folderPaths.length} folder{project.folderPaths.length !== 1 ? 's' : ''}
              </span>
              <button
                onClick={() => openEdit(project)}
                className="shrink-0 text-muted-fg transition-colors hover:text-fg"
                aria-label={`Edit ${project.name}`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="h-4 w-4"
                >
                  <path d="M2.695 14.763l-1.262 3.154a.5.5 0 00.65.65l3.155-1.262a4 4 0 001.343-.885L17.5 5.5a2.121 2.121 0 00-3-3L3.58 13.42a4 4 0 00-.885 1.343z" />
                </svg>
              </button>
              <button
                onClick={() => setDeletingProject(project)}
                className="shrink-0 text-muted-fg transition-colors hover:text-destructive"
                aria-label={`Delete ${project.name}`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="h-4 w-4"
                >
                  <path
                    fillRule="evenodd"
                    d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}

      {dialogMode && (
        <ProjectDialog
          project={editingProject ?? undefined}
          onSave={handleSave}
          onClose={closeDialog}
          error={dialogError}
        />
      )}

      {deletingProject && (
        <ConfirmDialog
          title="Delete Project"
          message={`Are you sure you want to delete "${deletingProject.name}"? This cannot be undone.`}
          onConfirm={handleDelete}
          onCancel={() => setDeletingProject(null)}
        />
      )}
      <Footer />
    </div>
  );
}
