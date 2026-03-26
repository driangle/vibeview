import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { Pagination } from './Pagination';

describe('Pagination', () => {
  it('renders nothing when there is only one page', () => {
    const { container } = render(
      <Pagination currentPage={1} totalPages={1} total={5} pageSize={10} onPageChange={vi.fn()} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('shows correct range text', () => {
    render(
      <Pagination currentPage={2} totalPages={3} total={25} pageSize={10} onPageChange={vi.fn()} />,
    );
    expect(screen.getByText(/Showing 11–20 of 25/)).toBeInTheDocument();
  });

  it('disables Previous on first page', () => {
    render(
      <Pagination currentPage={1} totalPages={3} total={30} pageSize={10} onPageChange={vi.fn()} />,
    );
    expect(screen.getByText('Previous')).toBeDisabled();
    expect(screen.getByText('Next')).toBeEnabled();
  });

  it('disables Next on last page', () => {
    render(
      <Pagination currentPage={3} totalPages={3} total={30} pageSize={10} onPageChange={vi.fn()} />,
    );
    expect(screen.getByText('Previous')).toBeEnabled();
    expect(screen.getByText('Next')).toBeDisabled();
  });

  it('calls onPageChange when clicking a page number', async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    render(
      <Pagination
        currentPage={1}
        totalPages={3}
        total={30}
        pageSize={10}
        onPageChange={onPageChange}
      />,
    );
    await user.click(screen.getByText('2'));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it('calls onPageChange when clicking Next', async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    render(
      <Pagination
        currentPage={1}
        totalPages={3}
        total={30}
        pageSize={10}
        onPageChange={onPageChange}
      />,
    );
    await user.click(screen.getByText('Next'));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it('shows ellipsis for many pages', () => {
    render(
      <Pagination
        currentPage={5}
        totalPages={10}
        total={100}
        pageSize={10}
        onPageChange={vi.fn()}
      />,
    );
    const ellipses = screen.getAllByText('...');
    expect(ellipses.length).toBeGreaterThanOrEqual(1);
  });
});
