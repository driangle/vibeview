import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { SearchShell } from './SearchShell';

function renderShell(props: Partial<Parameters<typeof SearchShell>[0]> = {}) {
  return render(
    <SearchShell title="Search here" {...props}>
      {() => <input aria-label="Search here" readOnly value="" />}
    </SearchShell>,
  );
}

describe('SearchShell', () => {
  it('starts collapsed as an icon trigger and expands on click', async () => {
    const user = userEvent.setup();
    renderShell();

    // Collapsed: the trigger button is present, the input is not.
    const trigger = screen.getByRole('button', { name: 'Search here' });
    expect(screen.queryByRole('textbox')).toBeNull();

    await user.click(trigger);

    // Expanded: the input appears and is focused; the trigger is gone.
    const input = screen.getByRole('textbox', { name: 'Search here' });
    expect(input).toBeInTheDocument();
    expect(input).toHaveFocus();
    expect(screen.queryByRole('button', { name: 'Search here' })).toBeNull();
  });

  it('renders expanded without a click when forceOpen is set', () => {
    renderShell({ forceOpen: true });
    expect(screen.getByRole('textbox', { name: 'Search here' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Search here' })).toBeNull();
  });

  it('collapses and calls onClose when Escape is pressed', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderShell({ onClose });

    await user.click(screen.getByRole('button', { name: 'Search here' }));
    expect(screen.getByRole('textbox')).toBeInTheDocument();

    await user.keyboard('{Escape}');

    expect(screen.queryByRole('textbox')).toBeNull();
    expect(screen.getByRole('button', { name: 'Search here' })).toBeInTheDocument();
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
