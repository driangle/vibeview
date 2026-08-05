import { describe, it, expect } from 'vitest';
import type { Exchange, MessageResponse } from '../../types';
import { exchangeBadges, resolveExchangeMessages } from './exchangeData';

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

function makeMessage(uuid: string): MessageResponse {
  return { uuid, type: 'user', timestamp: '2026-08-03T09:12:00Z' };
}

describe('resolveExchangeMessages', () => {
  const messages = ['a', 'b', 'c', 'd'].map(makeMessage);

  it('returns only the messages named in messageUuids, in session order', () => {
    const exchange = makeExchange({ index: 0, messageUuids: ['c', 'a'] });
    const resolved = resolveExchangeMessages({ exchange, messages });
    // Preserves session order (a before c), not the messageUuids order.
    expect(resolved.map((m) => m.uuid)).toEqual(['a', 'c']);
  });

  it('ignores uuids that are not present and returns [] when none match', () => {
    expect(
      resolveExchangeMessages({
        exchange: makeExchange({ index: 0, messageUuids: ['zzz'] }),
        messages,
      }),
    ).toEqual([]);
  });
});

describe('exchangeBadges', () => {
  it('emits no badges for a plain exchange', () => {
    expect(exchangeBadges(makeExchange({ index: 0 }))).toEqual([]);
  });

  it('emits one badge per active flag, then one per skill', () => {
    const exchange = makeExchange({
      index: 0,
      flags: { hasErrors: true, deepThinking: true, hasSubagents: false, approvalGate: true },
      skills: ['do-task', 'commit'],
    });
    const labels = exchangeBadges(exchange).map((b) => b.label);
    expect(labels).toEqual([
      'Error in results',
      'Deep thinking',
      'Ended on approval',
      'Skill /do-task',
      'Skill /commit',
    ]);
  });
});
