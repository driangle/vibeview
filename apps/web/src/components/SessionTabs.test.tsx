import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { SessionTabs, type SessionTab } from './SessionTabs';

// Mirrors SessionView's tab-to-pane wiring so we can assert the switch renders
// the right pane without mounting the whole page and its hooks.
function TabHarness() {
  const [tab, setTab] = useState<SessionTab>('conversation');
  return (
    <>
      <SessionTabs value={tab} onChange={setTab} />
      {tab === 'timeline' ? <div>timeline pane</div> : <div>conversation pane</div>}
    </>
  );
}

describe('SessionTabs', () => {
  it('renders both tabs', () => {
    render(<SessionTabs value="conversation" onChange={() => {}} />);
    expect(screen.getByRole('tab', { name: 'Conversation' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Timeline' })).toBeInTheDocument();
  });

  it('marks the active tab as selected', () => {
    render(<SessionTabs value="timeline" onChange={() => {}} />);
    expect(screen.getByRole('tab', { name: 'Timeline' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Conversation' })).toHaveAttribute(
      'aria-selected',
      'false',
    );
  });

  it('calls onChange with the clicked tab id', async () => {
    const onChange = vi.fn();
    render(<SessionTabs value="conversation" onChange={onChange} />);
    await userEvent.click(screen.getByRole('tab', { name: 'Timeline' }));
    expect(onChange).toHaveBeenCalledWith('timeline');
  });

  it('switches the rendered pane when a tab is clicked', async () => {
    render(<TabHarness />);
    expect(screen.getByText('conversation pane')).toBeInTheDocument();
    expect(screen.queryByText('timeline pane')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('tab', { name: 'Timeline' }));
    expect(screen.getByText('timeline pane')).toBeInTheDocument();
    expect(screen.queryByText('conversation pane')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('tab', { name: 'Conversation' }));
    expect(screen.getByText('conversation pane')).toBeInTheDocument();
    expect(screen.queryByText('timeline pane')).not.toBeInTheDocument();
  });
});
