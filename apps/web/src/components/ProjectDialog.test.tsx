import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { ProjectDialog } from './ProjectDialog';
import type { Project } from '../types';

vi.mock('swr', () => ({
  default: vi.fn(() => ({
    data: {
      sessions: [
        {
          project: '/home/user/app',
          id: '1',
          customTitle: '',
          timestamp: '',
          messageCount: 0,
          model: '',
          slug: '',
          usage: {
            inputTokens: 0,
            outputTokens: 0,
            cacheCreationInputTokens: 0,
            cacheReadInputTokens: 0,
            costUSD: 0,
          },
        },
      ],
      total: 1,
    },
    isLoading: false,
  })),
}));

const existingProject: Project = {
  id: 'proj-1',
  name: 'Existing',
  folderPaths: ['/home/user/app'],
  description: 'A description',
  color: '#ff0000',
};

describe('ProjectDialog', () => {
  it('renders in create mode with empty fields', () => {
    render(<ProjectDialog onSave={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByText('Create Project')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('My Project')).toHaveValue('');
  });

  it('renders in edit mode with pre-filled fields', () => {
    render(<ProjectDialog project={existingProject} onSave={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByText('Edit Project')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('My Project')).toHaveValue('Existing');
  });

  it('shows validation error for empty name', async () => {
    const user = userEvent.setup();
    render(<ProjectDialog onSave={vi.fn()} onClose={vi.fn()} />);
    await user.click(screen.getByText('Create'));
    expect(screen.getByText('Name is required')).toBeInTheDocument();
  });

  it('shows validation error for no folders selected', async () => {
    const user = userEvent.setup();
    render(<ProjectDialog onSave={vi.fn()} onClose={vi.fn()} />);
    await user.type(screen.getByPlaceholderText('My Project'), 'Test');
    await user.click(screen.getByText('Create'));
    expect(screen.getByText('Select at least one folder')).toBeInTheDocument();
  });

  it('calls onSave with form data when valid', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<ProjectDialog onSave={onSave} onClose={vi.fn()} />);

    await user.type(screen.getByPlaceholderText('My Project'), 'New Project');
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByText('Create'));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'New Project',
        folderPaths: ['/home/user/app'],
      }),
    );
  });

  it('displays error prop', () => {
    render(
      <ProjectDialog
        onSave={vi.fn()}
        onClose={vi.fn()}
        error='A project named "X" already exists'
      />,
    );
    expect(screen.getByText(/already exists/)).toBeInTheDocument();
  });

  it('calls onClose when cancel is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<ProjectDialog onSave={vi.fn()} onClose={onClose} />);
    await user.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('shows Save button in edit mode', () => {
    render(<ProjectDialog project={existingProject} onSave={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByText('Save')).toBeInTheDocument();
  });
});
