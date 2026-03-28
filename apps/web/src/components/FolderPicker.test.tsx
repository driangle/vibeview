import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FolderPicker } from './FolderPicker';

const mockSessions = {
  sessions: [
    {
      project: '/home/user/app-a',
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
    {
      project: '/home/user/app-b',
      id: '2',
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
    {
      project: '/home/user/app-a',
      id: '3',
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
  total: 3,
};

vi.mock('swr', () => ({
  default: vi.fn(() => ({ data: mockSessions, isLoading: false })),
}));

import useSWR from 'swr';

describe('FolderPicker', () => {
  beforeEach(() => {
    vi.mocked(useSWR).mockReturnValue({
      data: mockSessions,
      isLoading: false,
    } as ReturnType<typeof useSWR>);
  });

  it('renders unique directories from sessions', () => {
    render(<FolderPicker selected={[]} onChange={vi.fn()} />);
    expect(screen.getByText('app-a')).toBeInTheDocument();
    expect(screen.getByText('app-b')).toBeInTheDocument();
  });

  it('deduplicates directories', () => {
    render(<FolderPicker selected={[]} onChange={vi.fn()} />);
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes).toHaveLength(2);
  });

  it('shows selected state for pre-selected folders', () => {
    render(<FolderPicker selected={['/home/user/app-a']} onChange={vi.fn()} />);
    const checkboxes = screen.getAllByRole('checkbox');
    const checked = checkboxes.filter((cb) => (cb as HTMLInputElement).checked);
    expect(checked).toHaveLength(1);
  });

  it('calls onChange with added path when checkbox clicked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<FolderPicker selected={[]} onChange={onChange} />);
    await user.click(screen.getAllByRole('checkbox')[0]);
    expect(onChange).toHaveBeenCalledWith(['/home/user/app-a']);
  });

  it('calls onChange with removed path when unchecking', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <FolderPicker selected={['/home/user/app-a', '/home/user/app-b']} onChange={onChange} />,
    );
    await user.click(screen.getAllByRole('checkbox')[0]);
    expect(onChange).toHaveBeenCalledWith(['/home/user/app-b']);
  });

  it('filters directories by search input', async () => {
    const user = userEvent.setup();
    render(<FolderPicker selected={[]} onChange={vi.fn()} />);
    await user.type(screen.getByLabelText('Filter directories'), 'app-b');
    expect(screen.queryByText('app-a')).not.toBeInTheDocument();
    expect(screen.getByText('app-b')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    vi.mocked(useSWR).mockReturnValue({
      data: undefined,
      isLoading: true,
    } as ReturnType<typeof useSWR>);
    render(<FolderPicker selected={[]} onChange={vi.fn()} />);
    expect(screen.getByText('Loading directories...')).toBeInTheDocument();
  });

  it('shows empty state when no directories exist', () => {
    vi.mocked(useSWR).mockReturnValue({
      data: { sessions: [], total: 0 },
      isLoading: false,
    } as ReturnType<typeof useSWR>);
    render(<FolderPicker selected={[]} onChange={vi.fn()} />);
    expect(screen.getByText('No directories found.')).toBeInTheDocument();
  });

  it('shows selected count', () => {
    render(<FolderPicker selected={['/home/user/app-a', '/home/user/app-b']} onChange={vi.fn()} />);
    expect(screen.getByText('2 folders selected')).toBeInTheDocument();
  });
});
