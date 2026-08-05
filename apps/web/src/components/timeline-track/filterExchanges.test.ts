import { describe, it, expect } from 'vitest';
import type { Exchange } from '../../types';
import { filterExchanges, matchesFilters, matchesQuery } from './filterExchanges';
import { EMPTY_FILTERS, type FilterState } from './chips';

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

function filters(overrides: Partial<FilterState>): FilterState {
  return { ...EMPTY_FILTERS, ...overrides };
}

describe('matchesQuery', () => {
  const ex = makeExchange({
    index: 0,
    promptPreview: 'Refactor the parser',
    tools: ['Bash', 'Edit'],
    files: ['src/lib/timeline/buildTimeline.ts'],
    model: 'claude-opus-4-8',
    commands: ['/commit'],
    skills: ['deep-research'],
  });

  it('matches when the query is empty', () => {
    expect(matchesQuery(ex, '   ')).toBe(true);
  });

  it('matches across prompt, tools, files, model, commands, and skills', () => {
    for (const q of ['parser', 'bash', 'buildtimeline', 'opus', 'commit', 'deep-research']) {
      expect(matchesQuery(ex, q)).toBe(true);
    }
  });

  it('is case-insensitive and returns false for non-matches', () => {
    expect(matchesQuery(ex, 'PARSER')).toBe(true);
    expect(matchesQuery(ex, 'nonexistent')).toBe(false);
  });
});

describe('matchesFilters', () => {
  const errorEx = makeExchange({
    index: 0,
    flags: { ...makeExchange({ index: 0 }).flags, hasErrors: true },
  });
  const skillEx = makeExchange({ index: 1, skills: ['huckleberry'] });

  it('matches everything when no filter is active', () => {
    expect(matchesFilters(errorEx, EMPTY_FILTERS)).toBe(true);
    expect(matchesFilters(skillEx, EMPTY_FILTERS)).toBe(true);
  });

  it('narrows to exchanges matching an active chip', () => {
    expect(matchesFilters(errorEx, filters({ errors: true }))).toBe(true);
    expect(matchesFilters(skillEx, filters({ errors: true }))).toBe(false);
  });

  it('treats the Skills chip as "has any skill"', () => {
    expect(matchesFilters(skillEx, filters({ skills: true }))).toBe(true);
    expect(matchesFilters(errorEx, filters({ skills: true }))).toBe(false);
  });

  it('OR-combines multiple active chips', () => {
    const active = filters({ errors: true, skills: true });
    expect(matchesFilters(errorEx, active)).toBe(true);
    expect(matchesFilters(skillEx, active)).toBe(true);
  });
});

describe('filterExchanges', () => {
  const base = makeExchange({ index: 0 });
  const exchanges = [
    makeExchange({
      index: 0,
      promptPreview: 'Add auth',
      flags: { ...base.flags, hasErrors: true },
    }),
    makeExchange({ index: 1, promptPreview: 'Fix build', skills: ['commit-msg'] }),
    makeExchange({ index: 2, promptPreview: 'Add tests' }),
  ];

  it('returns all exchanges with no query and no filters', () => {
    expect(filterExchanges({ exchanges, query: '', filters: EMPTY_FILTERS })).toHaveLength(3);
  });

  it('applies query and filters together (AND across the two dimensions)', () => {
    const result = filterExchanges({
      exchanges,
      query: 'add',
      filters: filters({ errors: true }),
    });
    // "add auth" (error) and "add tests" match the query; only the error one survives the chip.
    expect(result.map((e) => e.index)).toEqual([0]);
  });
});
