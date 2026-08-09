import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { SidebarSection } from './SidebarSection';

beforeEach(() => localStorage.clear());

describe('SidebarSection', () => {
  it('shows the meta hint only while collapsed', async () => {
    const user = userEvent.setup();
    render(
      <SidebarSection id="t" icon="info" title="Models" meta="2 model switches" defaultCollapsed>
        <p>body</p>
      </SidebarSection>,
    );
    // Collapsed: the headline number is visible, the body is not.
    expect(screen.getByText('2 model switches')).toBeInTheDocument();
    expect(screen.queryByText('body')).toBeNull();

    // Expanded: the body shows and the redundant hint is hidden.
    await user.click(screen.getByText('Models'));
    expect(screen.getByText('body')).toBeInTheDocument();
    expect(screen.queryByText('2 model switches')).toBeNull();
  });

  it('collapses and expands its children on click', async () => {
    const user = userEvent.setup();
    render(
      <SidebarSection id="t2" icon="info" title="Files" defaultCollapsed>
        <p>body</p>
      </SidebarSection>,
    );
    expect(screen.queryByText('body')).toBeNull();
    await user.click(screen.getByText('Files'));
    expect(screen.getByText('body')).toBeInTheDocument();
  });
});
