import { useEffect, useRef, useState } from 'react';
import type { Project } from '../types';
import { FolderPicker } from './FolderPicker';
import { Modal } from './Modal';

interface ProjectDialogProps {
  project?: Project;
  onSave: (input: Omit<Project, 'id'>) => void;
  onClose: () => void;
  error?: string | null;
}

const inputClass =
  'w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-fg focus:border-ring focus:ring-1 focus:ring-ring focus:outline-none';

export function ProjectDialog({ project, onSave, onClose, error }: ProjectDialogProps) {
  const [name, setName] = useState(project?.name ?? '');
  const [description, setDescription] = useState(project?.description ?? '');
  const [color, setColor] = useState(project?.color ?? '#6366f1');
  const [folderPaths, setFolderPaths] = useState<string[]>(project?.folderPaths ?? []);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const nameRef = useRef<HTMLInputElement>(null);

  const isEdit = !!project;

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  function validate(): boolean {
    const errors: Record<string, string> = {};
    if (!name.trim()) errors.name = 'Name is required';
    if (folderPaths.length === 0) errors.folders = 'Select at least one folder';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;
    onSave({
      name: name.trim(),
      folderPaths,
      description: description.trim() || undefined,
      color,
    });
  }

  return (
    <Modal onClose={onClose} className="flex w-full max-w-lg flex-col bg-card">
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <h2 id="dialog-title" className="text-sm font-semibold text-fg">
          {isEdit ? 'Edit Project' : 'Create Project'}
        </h2>
        <button
          onClick={onClose}
          className="text-muted-fg transition-colors hover:text-fg"
          aria-label="Close"
        >
          &times;
        </button>
      </div>

      <div className="space-y-4 overflow-y-auto px-6 py-4">
        {error && <p className="text-sm text-destructive">{error}</p>}

        <div>
          <label className="mb-1 block text-sm font-medium text-fg">Name</label>
          <input
            ref={nameRef}
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setFieldErrors((prev) => ({ ...prev, name: '' }));
            }}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            className={inputClass}
            placeholder="My Project"
          />
          {fieldErrors.name && <p className="mt-1 text-xs text-destructive">{fieldErrors.name}</p>}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-fg">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={`${inputClass} resize-none`}
            rows={2}
            placeholder="Optional description"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-fg">Color</label>
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="h-8 w-8 cursor-pointer rounded border border-border"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-fg">Folders</label>
          <FolderPicker selected={folderPaths} onChange={setFolderPaths} />
          {fieldErrors.folders && (
            <p className="mt-1 text-xs text-destructive">{fieldErrors.folders}</p>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
        <button
          onClick={onClose}
          className="rounded-md bg-secondary px-3 py-1.5 text-sm font-medium text-secondary-fg transition-colors hover:bg-muted"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          className="rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-fg transition-colors hover:bg-primary/90"
        >
          {isEdit ? 'Save' : 'Create'}
        </button>
      </div>
    </Modal>
  );
}
