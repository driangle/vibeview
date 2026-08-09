import { screen, within } from '@testing-library/react';
import { vi } from 'vitest';
import type {
  ContentBlock,
  ContentBlockInput,
  Exchange,
  SessionInsights,
  TimelineInsights,
  TimelineResponse,
} from '../../types';
import type { TimelineController } from '../timeline-track/useTimeline';

const input = {} as ContentBlockInput;

export const sessionInsights: SessionInsights = {
  tools: [
    { name: 'Read', count: 12 },
    { name: 'Edit', count: 7 },
  ],
  commands: [{ command: 'npm run lint', toolUseId: 't1', messageUuid: 'c1' }],
  errors: [{ toolName: 'Bash', snippet: 'boom', messageUuid: 'err-1' }],
  files: {
    categories: { written: ['apps/web/src/App.tsx'], read: ['apps/web/src/index.ts'] },
    entries: [
      {
        toolUseId: 'f1',
        toolName: 'Write',
        filePath: 'apps/web/src/App.tsx',
        input,
        timestamp: '',
        messageUuid: 'file-1',
      },
      {
        toolUseId: 'f2',
        toolName: 'Read',
        filePath: 'apps/web/src/index.ts',
        input,
        timestamp: '',
        messageUuid: 'file-2',
      },
    ],
  },
  worktrees: [{ name: 'wt', path: '/tmp/wt', branch: 'feat/x', messageUuid: 'w1' }],
  skills: [{ name: 'commit-msg', count: 2, messageUuid: 's1' }],
  subagents: [
    {
      source: 'task',
      agentId: 'ag1',
      agentType: 'Explore',
      prompt: 'do the thing',
      description: 'd',
      firstMessageUuid: 'a1',
    },
  ],
};

export const timelineInsights: TimelineInsights = {
  timeSplit: [{ label: 'Model generation', durationMs: 60_000, pct: 100 }],
  models: [
    {
      model: 'claude-opus-4-8',
      tokens: 8000,
      durationMs: 90_000,
      costUSD: 1.2,
      exchanges: 1,
      switches: 0,
    },
    {
      model: 'claude-haiku-4-5',
      tokens: 2000,
      durationMs: 20_000,
      costUSD: 0.1,
      exchanges: 1,
      switches: 1,
    },
  ],
  modelBands: [],
  modelSwitches: 1,
  overviewBuckets: [],
  busiestFiles: [],
  topCommands: [],
  skills: [],
  toolMix: [],
  errorCount: 3,
  longestExchangeIndex: 1,
  top5TokenSharePct: 82,
  totalTokens: 10_000,
  totalCostUSD: 1.3,
  totalDurationMs: 60_000,
  totalIdleMs: 0,
  totalSpanMs: 0,
};

export function makeExchange(overrides: Partial<Exchange> & { index: number }): Exchange {
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

export const timeline: TimelineResponse = {
  exchanges: [
    makeExchange({ index: 0, promptPreview: 'Edit config', model: 'claude-opus-4-8' }),
    makeExchange({ index: 1, promptPreview: 'Fix bug', model: 'claude-haiku-4-5' }),
  ],
  insights: timelineInsights,
};

export const noopController = { setQuery: vi.fn() } as unknown as TimelineController;
export const emptyToolResults = new Map<string, ContentBlock>();

/** Scopes queries to the sidebar's `complementary` landmark. */
export function sidebar() {
  return within(screen.getByRole('complementary'));
}
