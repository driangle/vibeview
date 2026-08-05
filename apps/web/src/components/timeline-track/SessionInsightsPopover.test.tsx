import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import type { Exchange, TimelineInsights } from '../../types';
import { SessionInsightsPopover } from './SessionInsightsPopover';

const insights: TimelineInsights = {
  timeSplit: [
    { label: 'Model generation', durationMs: 60_000, pct: 40 },
    { label: 'Tool calls', durationMs: 30_000, pct: 20 },
    { label: 'Subagents', durationMs: 15_000, pct: 10 },
    { label: 'Waiting on you', durationMs: 45_000, pct: 30 },
  ],
  models: [
    {
      model: 'claude-opus-4-8',
      tokens: 8000,
      durationMs: 90_000,
      costUSD: 1.2,
      exchanges: 4,
      switches: 1,
    },
    {
      model: 'claude-haiku-4-5',
      tokens: 2000,
      durationMs: 20_000,
      costUSD: 0.1,
      exchanges: 2,
      switches: 1,
    },
  ],
  modelBands: [],
  modelSwitches: 2,
  overviewBuckets: [],
  busiestFiles: [
    { name: 'apps/web/src/App.tsx', count: 5 },
    { name: 'apps/web/src/index.ts', count: 2 },
  ],
  topCommands: [{ name: 'npm run lint', count: 3 }],
  skills: [{ name: 'commit-msg', count: 2 }],
  toolMix: [
    { name: 'Read', count: 12 },
    { name: 'Edit', count: 7 },
  ],
  errorCount: 3,
  longestExchangeIndex: 2,
  top5TokenSharePct: 82,
  totalTokens: 10_000,
  totalCostUSD: 1.3,
  totalDurationMs: 105_000,
  totalIdleMs: 45_000,
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

function renderPopover(overrides: Partial<Parameters<typeof SessionInsightsPopover>[0]> = {}) {
  return render(
    <SessionInsightsPopover
      insights={insights}
      exchanges={[makeExchange({ index: 2, durationMs: 240_000 })]}
      onSearch={noop}
      onJumpToFirstError={noop}
      onJumpToLongest={noop}
      onJumpToCostliest={noop}
      {...overrides}
    />,
  );
}

describe('SessionInsightsPopover', () => {
  it('renders every section from the insights fixture', () => {
    renderPopover();

    // Time-split legend: all four segments.
    expect(screen.getByText('Model generation')).toBeInTheDocument();
    expect(screen.getByText('Tool calls')).toBeInTheDocument();
    expect(screen.getByText('Subagents')).toBeInTheDocument();
    expect(screen.getByText('Waiting on you')).toBeInTheDocument();

    // Headline tiles.
    expect(screen.getByText('errors · jump to first')).toBeInTheDocument();
    expect(screen.getByText('longest run · #3')).toBeInTheDocument(); // index 2 -> #3
    expect(screen.getByText('82%')).toBeInTheDocument();
    expect(screen.getByText('4m', { exact: false })).toBeInTheDocument(); // longest run 240s = 4m

    // Models used.
    expect(screen.getByText('claude-opus-4-8')).toBeInTheDocument();
    expect(screen.getByText('2 model switches')).toBeInTheDocument();

    // Busiest files, commands, skills, tools.
    expect(screen.getByText('apps/web/src/App.tsx')).toBeInTheDocument();
    expect(screen.getByText('npm run lint')).toBeInTheDocument();
    expect(screen.getByText('commit-msg', { exact: false })).toBeInTheDocument();
    expect(screen.getByText('Read')).toBeInTheDocument();
    expect(screen.getByText('Edit')).toBeInTheDocument();
  });

  it('sets the search query to a file name when its row is clicked', async () => {
    const user = userEvent.setup();
    const onSearch = vi.fn();
    renderPopover({ onSearch });

    await user.click(screen.getByText('apps/web/src/App.tsx'));
    expect(onSearch).toHaveBeenCalledWith('apps/web/src/App.tsx');
  });

  it('sets the search query to a tool name when its chip is clicked', async () => {
    const user = userEvent.setup();
    const onSearch = vi.fn();
    renderPopover({ onSearch });

    await user.click(screen.getByText('Read'));
    expect(onSearch).toHaveBeenCalledWith('Read');
  });

  it('jumps to the first error when the errors tile is clicked', async () => {
    const user = userEvent.setup();
    const onJumpToFirstError = vi.fn();
    renderPopover({ onJumpToFirstError });

    await user.click(screen.getByText('errors · jump to first'));
    expect(onJumpToFirstError).toHaveBeenCalledTimes(1);
  });

  it('hides a section when its list is empty', () => {
    renderPopover({ insights: { ...insights, skills: [], topCommands: [] } });
    expect(screen.queryByText('Skills loaded')).toBeNull();
    expect(screen.queryByText('Most-run commands')).toBeNull();
    // Sections with data still render.
    expect(screen.getByText('Tool mix')).toBeInTheDocument();
  });
});
