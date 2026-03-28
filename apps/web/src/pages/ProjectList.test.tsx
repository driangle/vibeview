import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Project } from '../types';

const mockCreateProject = vi.fn();
const mockUpdateProject = vi.fn();
const mockDeleteProject = vi.fn();

let mockProjects: Project[] = [];

vi.mock('../hooks/useProjects', () => ({
  useProjects: vi.fn(() => ({
    get projects() {
      return mockProjects;
    },
    createProject: mockCreateProject,
    updateProject: mockUpdateProject,
    deleteProject: mockDeleteProject,
  })),
  DuplicateProjectNameError: class DuplicateProjectNameError extends Error {
    constructor(name: string) {
      super(`A project named "${name}" already exists`);
      this.name = 'DuplicateProjectNameError';
    }
  },
}));

vi.mock('swr', () => ({
  default: vi.fn(() => ({
    data: { sessions: [], total: 0 },
    isLoading: false,
  })),
}));

// Import after mocks are set up
const { ProjectList } = await import('./ProjectList');

describe('ProjectList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockProjects = [
      {
        id: '1',
        name: 'Alpha',
        folderPaths: ['/path/a', '/path/b'],
        description: 'First project',
        color: '#ff0000',
      },
      { id: '2', name: 'Beta', folderPaths: ['/path/c'] },
    ];
  });

  it('renders project list with names', () => {
    render(<ProjectList />);
    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.getByText('Beta')).toBeInTheDocument();
  });

  it('shows project count', () => {
    render(<ProjectList />);
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('shows folder count for each project', () => {
    render(<ProjectList />);
    expect(screen.getByText('2 folders')).toBeInTheDocument();
    expect(screen.getByText('1 folder')).toBeInTheDocument();
  });

  it('shows description when present', () => {
    render(<ProjectList />);
    expect(screen.getByText('First project')).toBeInTheDocument();
  });

  it('opens create dialog when New Project clicked', async () => {
    const user = userEvent.setup();
    render(<ProjectList />);
    await user.click(screen.getByText('New Project'));
    expect(screen.getByText('Create Project')).toBeInTheDocument();
  });

  it('opens edit dialog when edit button clicked', async () => {
    const user = userEvent.setup();
    render(<ProjectList />);
    await user.click(screen.getByLabelText('Edit Alpha'));
    expect(screen.getByText('Edit Project')).toBeInTheDocument();
  });

  it('opens confirmation dialog when delete button clicked', async () => {
    const user = userEvent.setup();
    render(<ProjectList />);
    await user.click(screen.getByLabelText('Delete Alpha'));
    expect(screen.getByText(/Are you sure you want to delete "Alpha"/)).toBeInTheDocument();
  });

  it('calls deleteProject after confirmation', async () => {
    const user = userEvent.setup();
    render(<ProjectList />);
    await user.click(screen.getByLabelText('Delete Alpha'));
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    expect(mockDeleteProject).toHaveBeenCalledWith('1');
  });

  it('shows empty state when no projects', () => {
    mockProjects = [];
    render(<ProjectList />);
    expect(screen.getByText(/No projects yet/)).toBeInTheDocument();
  });
});
