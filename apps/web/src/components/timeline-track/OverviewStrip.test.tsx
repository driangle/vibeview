import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import type { Exchange, TimelineInsights } from '../../types';
import { OverviewStrip } from './OverviewStrip';
import { formatTimeOfDay } from './format';

const emptyInsights: TimelineInsights = {
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
  totalSpanMs: 0,
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

const noop = () => {};

describe('OverviewStrip', () => {
  it('colours each bucket by its error level', () => {
    const insights: TimelineInsights = {
      ...emptyInsights,
      overviewBuckets: [
        { tokens: 100, errorLevel: 0 },
        { tokens: 200, errorLevel: 1 },
        { tokens: 300, errorLevel: 2 },
      ],
    };
    render(
      <OverviewStrip
        insights={insights}
        exchanges={[]}
        selectedIndex={null}
        onSelectIndex={noop}
      />,
    );

    const buckets = screen.getAllByTestId('overview-bucket');
    expect(buckets).toHaveLength(3);
    expect(buckets[0].className).toContain('bg-primary/40'); // no errors → blue
    expect(buckets[1].className).toContain('bg-destructive/50'); // one error → faded red
    expect(buckets[2].className).toContain('bg-destructive'); // two+ → solid red
  });

  it('selects a model band’s first exchange when clicked', async () => {
    const user = userEvent.setup();
    const onSelectIndex = vi.fn();
    const insights: TimelineInsights = {
      ...emptyInsights,
      modelBands: [
        { model: 'claude-opus-4-8', leftPct: 0, widthPct: 60, exchanges: 3, firstIndex: 0 },
        { model: 'claude-haiku-4-5', leftPct: 60, widthPct: 40, exchanges: 2, firstIndex: 3 },
      ],
    };
    render(
      <OverviewStrip
        insights={insights}
        exchanges={[]}
        selectedIndex={null}
        onSelectIndex={onSelectIndex}
      />,
    );

    await user.click(screen.getByTitle('claude-haiku-4-5 · 2 exchanges'));
    expect(onSelectIndex).toHaveBeenCalledWith(3);
  });

  it('titles a single-exchange band with the singular label', () => {
    const insights: TimelineInsights = {
      ...emptyInsights,
      modelBands: [
        { model: 'claude-opus-4-8', leftPct: 0, widthPct: 100, exchanges: 1, firstIndex: 0 },
      ],
    };
    render(
      <OverviewStrip
        insights={insights}
        exchanges={[]}
        selectedIndex={null}
        onSelectIndex={noop}
      />,
    );
    expect(screen.getByTitle('claude-opus-4-8 · 1 exchange')).toBeInTheDocument();
  });

  it('renders the clock range from the first start and last end', () => {
    const start = '2026-08-03T09:12:00Z';
    const end = '2026-08-03T10:45:00Z';
    const exchanges = [
      makeExchange({ index: 0, startTime: start }),
      makeExchange({ index: 1, endTime: end }),
    ];
    render(
      <OverviewStrip
        insights={emptyInsights}
        exchanges={exchanges}
        selectedIndex={null}
        onSelectIndex={noop}
      />,
    );
    // Assert via the same formatter so the test is timezone-independent.
    const expected = `${formatTimeOfDay(start)} → ${formatTimeOfDay(end)}`;
    expect(screen.getByText(expected)).toBeInTheDocument();
  });

  it('renders nothing when show is false', () => {
    const { container } = render(
      <OverviewStrip
        insights={emptyInsights}
        exchanges={[]}
        selectedIndex={null}
        onSelectIndex={noop}
        show={false}
      />,
    );
    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByTestId('overview-strip')).toBeNull();
  });
});
