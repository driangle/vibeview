import { describe, it, expect, vi } from 'vitest';
import type { Exchange, SessionInsights, TimelineResponse } from '../../types';
import type { TimelineController } from '../timeline-track/useTimeline';
import { buildConversationActions, buildTimelineActions, costliestExchange } from './actions';

function makeExchange(overrides: Partial<Exchange> & { index: number }): Exchange {
  return {
    startTime: '',
    endTime: '',
    durationMs: 1000,
    idleBeforeMs: 0,
    promptPreview: `Prompt ${overrides.index}`,
    model: 'claude-opus-4-8',
    tokens: 100,
    costUSD: 0.1,
    tools: [],
    files: [],
    commands: [],
    skills: [],
    flags: { hasErrors: false, deepThinking: false, hasSubagents: false, approvalGate: false },
    messageUuids: [],
    ...overrides,
  };
}

function makeTimeline(exchanges: Exchange[], longestExchangeIndex = -1): TimelineResponse {
  return {
    exchanges,
    // Only the fields the actions read are needed here.
    insights: { longestExchangeIndex } as TimelineResponse['insights'],
  };
}

const emptyInsights = { errors: [] } as unknown as SessionInsights;

describe('costliestExchange', () => {
  it('returns the exchange with the most tokens', () => {
    const timeline = makeTimeline([
      makeExchange({ index: 0, tokens: 100 }),
      makeExchange({ index: 1, tokens: 900 }),
      makeExchange({ index: 2, tokens: 300 }),
    ]);
    expect(costliestExchange(timeline)?.index).toBe(1);
  });

  it('returns undefined for an empty or null timeline', () => {
    expect(costliestExchange(null)).toBeUndefined();
    expect(costliestExchange(makeTimeline([]))).toBeUndefined();
  });
});

describe('buildTimelineActions', () => {
  it('filters the track by an entity query', () => {
    const setQuery = vi.fn();
    const controller = { setQuery } as unknown as TimelineController;
    buildTimelineActions(controller).onEntity({ query: 'App.tsx' });
    expect(setQuery).toHaveBeenCalledWith('App.tsx');
  });

  it('jumps to the exchange containing a message when there is no query', () => {
    const reset = vi.fn();
    const onSelectIndex = vi.fn();
    const controller = {
      setQuery: vi.fn(),
      reset,
      onSelectIndex,
      allExchanges: [
        makeExchange({ index: 0, messageUuids: ['a'] }),
        makeExchange({ index: 1, messageUuids: ['b', 'c'] }),
      ],
    } as unknown as TimelineController;

    buildTimelineActions(controller).onEntity({ query: '', messageUuid: 'c' });
    expect(reset).toHaveBeenCalledTimes(1);
    expect(onSelectIndex).toHaveBeenCalledWith(1);
  });
});

describe('buildConversationActions', () => {
  const base = {
    timeline: makeTimeline([], -1),
    insights: emptyInsights,
    controller: { setQuery: vi.fn() } as unknown as TimelineController,
  };

  it('navigates to the message when an entity has one', () => {
    const navigateToMessage = vi.fn();
    const setTab = vi.fn();
    buildConversationActions({ ...base, navigateToMessage, setTab }).onEntity({
      query: 'App.tsx',
      messageUuid: 'uuid-1',
    });
    expect(navigateToMessage).toHaveBeenCalledWith('uuid-1');
    expect(setTab).not.toHaveBeenCalled();
  });

  it('falls back to the Timeline tab + filter when an entity has no message', () => {
    const navigateToMessage = vi.fn();
    const setTab = vi.fn();
    const setQuery = vi.fn();
    buildConversationActions({
      ...base,
      controller: { setQuery } as unknown as TimelineController,
      navigateToMessage,
      setTab,
    }).onEntity({ query: 'claude-opus-4-8' });
    expect(setTab).toHaveBeenCalledWith('timeline');
    expect(setQuery).toHaveBeenCalledWith('claude-opus-4-8');
    expect(navigateToMessage).not.toHaveBeenCalled();
  });

  it('jumps to the first error message', () => {
    const navigateToMessage = vi.fn();
    buildConversationActions({
      ...base,
      insights: {
        errors: [{ toolName: 'Bash', snippet: 'boom', messageUuid: 'err-1' }],
      } as SessionInsights,
      navigateToMessage,
      setTab: vi.fn(),
    }).onJumpToFirstError();
    expect(navigateToMessage).toHaveBeenCalledWith('err-1');
  });

  it('jumps to the longest run by resolving its exchange', () => {
    const navigateToMessage = vi.fn();
    const timeline = makeTimeline(
      [makeExchange({ index: 0 }), makeExchange({ index: 5, messageUuids: ['long-1'] })],
      5,
    );
    buildConversationActions({
      ...base,
      timeline,
      navigateToMessage,
      setTab: vi.fn(),
    }).onJumpToLongest();
    expect(navigateToMessage).toHaveBeenCalledWith('long-1');
  });
});
