import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import type { Exchange, TimelineResponse } from '../../types';
import { TimelineTrack } from './TimelineTrack';
import { IDLE_DIVIDER_MIN_MS, LONG_EXCHANGE_MS } from './format';

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

function makeTimeline(exchanges: Exchange[]): TimelineResponse {
  return { exchanges, insights: emptyInsights };
}

const noop = () => {};

describe('TimelineTrack', () => {
  it('renders one row per exchange with populated columns', () => {
    const timeline = makeTimeline([
      makeExchange({
        index: 0,
        promptPreview: 'Fix the build',
        durationMs: 45_000,
        tokens: 12_000,
        tools: ['Bash', 'Edit'],
        files: ['src/a.ts', 'src/b.ts'],
      }),
      makeExchange({ index: 1, promptPreview: 'Write tests' }),
    ]);
    render(<TimelineTrack timeline={timeline} selectedIndex={null} onSelectIndex={noop} />);

    const rows = screen.getAllByRole('button');
    expect(rows).toHaveLength(2);

    const first = rows[0];
    expect(within(first).getByText('Fix the build')).toBeInTheDocument();
    expect(within(first).getByText('45s')).toBeInTheDocument(); // elapsed label
    expect(within(first).getByText('12.0k')).toBeInTheDocument(); // token label
    expect(within(first).getByText('Bash')).toBeInTheDocument(); // tool chip
    expect(within(first).getByText('src/a.ts')).toBeInTheDocument(); // first file
    expect(within(first).getByText('+1')).toBeInTheDocument(); // more-files count
  });

  it('renders an idle divider only before gapped exchanges', () => {
    const timeline = makeTimeline([
      makeExchange({ index: 0, idleBeforeMs: 0 }),
      makeExchange({ index: 1, idleBeforeMs: 1_000 }), // below threshold
      makeExchange({ index: 2, idleBeforeMs: IDLE_DIVIDER_MIN_MS + 60_000 }),
    ]);
    render(<TimelineTrack timeline={timeline} selectedIndex={null} onSelectIndex={noop} />);

    const dividers = screen.getAllByTestId('idle-divider');
    expect(dividers).toHaveLength(1);
    expect(dividers[0]).toHaveTextContent(/idle/);
  });

  it('renders the elapsed bar amber for long exchanges and blue otherwise', () => {
    const timeline = makeTimeline([
      makeExchange({ index: 0, durationMs: LONG_EXCHANGE_MS }),
      makeExchange({ index: 1, durationMs: 5_000 }),
    ]);
    const { container } = render(
      <TimelineTrack timeline={timeline} selectedIndex={null} onSelectIndex={noop} />,
    );

    const rows = screen.getAllByRole('button');
    expect(within(rows[0]).getByText('2m')).toBeInTheDocument();
    // The long row's elapsed bar uses the warning (amber) token; the short one uses primary.
    expect(container.querySelector('.bg-warning')).not.toBeNull();
    expect(rows[1].querySelector('.bg-warning')).toBeNull();
  });

  it('calls onSelectIndex with the exchange index when a row is clicked', async () => {
    const user = userEvent.setup();
    const onSelectIndex = vi.fn();
    const timeline = makeTimeline([makeExchange({ index: 0 }), makeExchange({ index: 1 })]);
    render(
      <TimelineTrack timeline={timeline} selectedIndex={null} onSelectIndex={onSelectIndex} />,
    );

    await user.click(screen.getAllByRole('button')[1]);
    expect(onSelectIndex).toHaveBeenCalledWith(1);
  });

  it('marks the selected row with aria-current', () => {
    const timeline = makeTimeline([makeExchange({ index: 0 }), makeExchange({ index: 1 })]);
    render(<TimelineTrack timeline={timeline} selectedIndex={1} onSelectIndex={noop} />);

    const rows = screen.getAllByRole('button');
    expect(rows[0]).not.toHaveAttribute('aria-current');
    expect(rows[1]).toHaveAttribute('aria-current', 'true');
  });

  it('renders the empty state when there are no exchanges', () => {
    render(<TimelineTrack timeline={makeTimeline([])} selectedIndex={null} onSelectIndex={noop} />);
    expect(screen.getByTestId('track-empty-state')).toBeInTheDocument();
    expect(screen.getByText('No exchanges match these filters')).toBeInTheDocument();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('shows the reset link in the empty state only when onReset is provided', () => {
    const onReset = vi.fn();
    render(
      <TimelineTrack
        timeline={makeTimeline([])}
        selectedIndex={null}
        onSelectIndex={noop}
        onReset={onReset}
      />,
    );
    expect(screen.getByText('Clear filters and search')).toBeInTheDocument();
  });
});
