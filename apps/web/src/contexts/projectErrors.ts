import type { Project } from '../types';

export class DuplicateProjectNameError extends Error {
  constructor(name: string) {
    super(`A project named "${name}" already exists`);
    this.name = 'DuplicateProjectNameError';
  }
}

export function findDuplicate(projects: Project[], name: string, excludeId?: string): boolean {
  return projects.some((p) => p.id !== excludeId && p.name.toLowerCase() === name.toLowerCase());
}
