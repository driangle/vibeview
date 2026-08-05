import { useState } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import type { Exchange, TimelineResponse } from '../../types';
import { TimelineTab } from './TimelineTab';
import { TimelineSearch } from './TimelineSearch';
import { useTimeline } from './useTimeline';

const emptyInsights: TimelineResponse['insights'] = {
  timeSplit: [],
  models: [],
  modelBands: [],
  modelSwitches: 0,
  overviewBuckets: [],
  busiestFiles: [],
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

function makeExchange(overrides: Partial<Exchange> & { index: number }): Exchange {
  return {
    startTime: '2026-08-03T09:12:00Z',
    endTime: '2026-08-03T09:13:00Z',
    durationMs: 30_000,
    idleBeforeMs: 0,
    promptPreview: `Prompt ${overrides.index}`,
    model: 'claude-opus-4-8',
    tokens: 1000,
    costUSD: 0.5,
    tools: [],
    files: [],
    commands: [],
    skills: [],
    flags: { hasErrors: false, deepThinking: false, hasSubagents: false, approvalGate: false },
    messageUuids: [],
    ...overrides,
  };
}

function withErrors(index: number, prompt: string): Exchange {
  const ex = makeExchange({ index, promptPreview: prompt });
  return { ...ex, flags: { ...ex.flags, hasErrors: true } };
}

/**
 * Controlled harness mirroring SessionView: selection lives in the parent, and
 * the header search shares the tab's controller (search moved out of the toolbar).
 */
function Harness({ timeline }: { timeline: TimelineResponse }) {
  const [selected, setSelected] = useState<number | null>(null);
  const controller = useTimeline({
    timeline,
    selectedIndex: selected,
    onSelectIndex: setSelected,
  });
  return (
    <>
      <TimelineSearch
        query={controller.query}
        onQueryChange={controller.setQuery}
        matchLabel={controller.matchLabel}
        onPrev={() => controller.step(-1)}
        onNext={() => controller.step(1)}
        onClear={controller.clearSearch}
      />
      <TimelineTab timeline={timeline} controller={controller} />
    </>
  );
}

function makeTimeline(
  exchanges: Exchange[],
  insights: Partial<TimelineResponse['insights']> = {},
): TimelineResponse {
  return { exchanges, insights: { ...emptyInsights, ...insights } };
}

/** The clickable exchange rows, excluding the toolbar chip/search buttons. */
function trackRows() {
  return within(screen.getByTestId('timeline-track')).queryAllByRole('button');
}

describe('TimelineTab', () => {
  it('shows per-chip counts and narrows the track when a chip is toggled', async () => {
    const user = userEvent.setup();
    const timeline = makeTimeline([
      withErrors(0, 'Broken build'),
      makeExchange({ index: 1, promptPreview: 'Add feature' }),
      withErrors(2, 'Flaky test'),
    ]);
    render(<Harness timeline={timeline} />);

    // Count comes from the full set, regardless of active filters.
    const errorsChip = screen.getByRole('button', { name: /Errors 2/ });
    expect(screen.getByText('3 exchanges')).toBeInTheDocument();
    expect(trackRows()).toHaveLength(3);

    await user.click(errorsChip);

    expect(trackRows()).toHaveLength(2);
    expect(screen.getByText('Broken build')).toBeInTheDocument();
    expect(screen.getByText('Flaky test')).toBeInTheDocument();
    expect(screen.queryByText('Add feature')).toBeNull();
    expect(screen.getByText('2 of 3')).toBeInTheDocument();
  });

  it('narrows the track by search and updates the match counter', async () => {
    const user = userEvent.setup();
    const timeline = makeTimeline([
      makeExchange({ index: 0, promptPreview: 'Add auth flow' }),
      makeExchange({ index: 1, promptPreview: 'Fix build' }),
      makeExchange({ index: 2, promptPreview: 'Add tests' }),
    ]);
    render(<Harness timeline={timeline} />);

    // The search collapses to an icon; open it before typing.
    await user.click(screen.getByRole('button', { name: 'Search session' }));
    await user.type(screen.getByLabelText('Search session'), 'add');

    expect(trackRows()).toHaveLength(2);
    expect(screen.getByText('Add auth flow')).toBeInTheDocument();
    expect(screen.getByText('Add tests')).toBeInTheDocument();
    expect(screen.queryByText('Fix build')).toBeNull();
    expect(screen.getByText('2 of 3')).toBeInTheDocument();
    // No selection yet -> counter points at the first of two matches.
    expect(screen.getByText('1/2')).toBeInTheDocument();
  });

  it('selects the next error exchange when "e" is pressed', async () => {
    const user = userEvent.setup();
    const timeline = makeTimeline([
      makeExchange({ index: 0, promptPreview: 'Plain one' }),
      withErrors(1, 'First error'),
      makeExchange({ index: 2, promptPreview: 'Plain two' }),
      withErrors(3, 'Second error'),
    ]);
    render(<Harness timeline={timeline} />);

    await user.keyboard('e');
    expect(screen.getByText('First error').closest('button')).toHaveAttribute(
      'aria-current',
      'true',
    );

    await user.keyboard('e');
    expect(screen.getByText('Second error').closest('button')).toHaveAttribute(
      'aria-current',
      'true',
    );
  });

  it('clears filters and search via the empty-state reset link', async () => {
    const user = userEvent.setup();
    const timeline = makeTimeline([
      makeExchange({ index: 0, promptPreview: 'Add auth' }),
      makeExchange({ index: 1, promptPreview: 'Fix build' }),
    ]);
    render(<Harness timeline={timeline} />);

    // A query that matches nothing surfaces the empty state + reset link.
    await user.click(screen.getByRole('button', { name: 'Search session' }));
    await user.type(screen.getByLabelText('Search session'), 'zzz-no-match');
    expect(screen.getByTestId('track-empty-state')).toBeInTheDocument();

    await user.click(screen.getByText('Clear filters and search'));

    expect(screen.queryByTestId('track-empty-state')).toBeNull();
    expect(trackRows()).toHaveLength(2);
    expect(screen.getByLabelText('Search session')).toHaveValue('');
    expect(screen.getByText('2 exchanges')).toBeInTheDocument();
  });
});
