import { useState } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import type { Exchange, TimelineResponse } from '../../types';
import { TimelineTab } from './TimelineTab';
import { TimelineSidebar } from './TimelineSidebar';
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

function makeTimeline(
  exchanges: Exchange[],
  insights: Partial<TimelineResponse['insights']> = {},
): TimelineResponse {
  return { exchanges, insights: { ...emptyInsights, ...insights } };
}

/**
 * The sidebar and the tab share one controller, exactly as SessionView wires
 * them — so a click in the sidebar must drive the track.
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
      <TimelineSidebar timeline={timeline} controller={controller} />
    </>
  );
}

function trackRows() {
  return within(screen.getByTestId('timeline-track')).queryAllByRole('button');
}

/** The insights sidebar (an `<aside>`), scoped so clicks don't hit track file chips. */
function sidebar() {
  return within(screen.getByRole('complementary'));
}

describe('TimelineSidebar', () => {
  it('renders the session insights heading and breakdown', () => {
    const timeline = makeTimeline([makeExchange({ index: 0 })], {
      busiestFiles: [{ name: 'App.tsx', count: 1 }],
    });
    render(<Harness timeline={timeline} />);

    expect(screen.getByRole('heading', { name: 'Session insights' })).toBeInTheDocument();
    expect(sidebar().getByText('App.tsx')).toBeInTheDocument();
  });

  it('narrows the shared track when a busiest-file row is clicked in the sidebar', async () => {
    const user = userEvent.setup();
    const timeline = makeTimeline(
      [
        makeExchange({ index: 0, promptPreview: 'Edit config', files: ['config.ts'] }),
        makeExchange({ index: 1, promptPreview: 'Edit app', files: ['App.tsx'] }),
      ],
      { busiestFiles: [{ name: 'App.tsx', count: 1 }] },
    );
    render(<Harness timeline={timeline} />);

    expect(trackRows()).toHaveLength(2);

    await user.click(sidebar().getByText('App.tsx'));

    // The track narrowed to the file's exchange and the search box reflects it.
    expect(trackRows()).toHaveLength(1);
    expect(screen.getByText('Edit app')).toBeInTheDocument();
    expect(screen.queryByText('Edit config')).toBeNull();
    expect(screen.getByLabelText('Search session')).toHaveValue('App.tsx');
  });
});
