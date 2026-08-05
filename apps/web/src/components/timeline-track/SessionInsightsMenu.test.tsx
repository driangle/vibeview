import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import type { TimelineInsights } from '../../types';
import { SessionInsightsMenu } from './SessionInsightsMenu';

const insights: TimelineInsights = {
  timeSplit: [],
  models: [],
  modelBands: [],
  modelSwitches: 0,
  overviewBuckets: [],
  busiestFiles: [{ name: 'apps/web/src/App.tsx', count: 3 }],
  topCommands: [],
  skills: [],
  toolMix: [],
  errorCount: 0,
  longestExchangeIndex: -1,
  top5TokenSharePct: 0,
  totalTokens: 0,
  totalCostUSD: 0,
  totalDurationMs: 0,
  totalIdleMs: 0,
};

const noop = () => {};

function renderMenu(onSearch = noop) {
  return render(
    <div>
      <button type="button">outside</button>
      <SessionInsightsMenu
        insights={insights}
        exchanges={[]}
        onSearch={onSearch}
        onJumpToFirstError={noop}
        onJumpToLongest={noop}
        onJumpToCostliest={noop}
      />
    </div>,
  );
}

const toggle = () => screen.getByRole('button', { name: /Session insights/ });
const popover = () => screen.queryByTestId('session-insights-popover');

describe('SessionInsightsMenu', () => {
  it('toggles the popover open and closed from the button', async () => {
    const user = userEvent.setup();
    renderMenu();

    expect(popover()).toBeNull();
    expect(toggle()).toHaveAttribute('aria-expanded', 'false');

    await user.click(toggle());
    expect(popover()).toBeInTheDocument();
    expect(toggle()).toHaveAttribute('aria-expanded', 'true');

    await user.click(toggle());
    expect(popover()).toBeNull();
    expect(toggle()).toHaveAttribute('aria-expanded', 'false');
  });

  it('closes on Escape', async () => {
    const user = userEvent.setup();
    renderMenu();

    await user.click(toggle());
    expect(popover()).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(popover()).toBeNull();
  });

  it('closes on an outside click', async () => {
    const user = userEvent.setup();
    renderMenu();

    await user.click(toggle());
    expect(popover()).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'outside' }));
    expect(popover()).toBeNull();
  });

  it('closes after a row click filters the track', async () => {
    const user = userEvent.setup();
    const onSearch = vi.fn();
    renderMenu(onSearch);

    await user.click(toggle());
    await user.click(screen.getByText('apps/web/src/App.tsx'));

    expect(onSearch).toHaveBeenCalledWith('apps/web/src/App.tsx');
    expect(popover()).toBeNull();
  });
});
