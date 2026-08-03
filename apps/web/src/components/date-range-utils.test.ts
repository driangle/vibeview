import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { daysAgo, endOfDay, startOfDay, toDateStr, usePresets } from './date-range-utils';

describe('date range utilities', () => {
  afterEach(() => vi.useRealTimers());

  it('uses local calendar boundaries instead of UTC boundaries', () => {
    const instant = new Date(2026, 6, 15, 13, 42, 12, 345);
    const start = new Date(startOfDay(instant));
    const end = new Date(endOfDay(instant));

    expect([start.getFullYear(), start.getMonth(), start.getDate()]).toEqual([2026, 6, 15]);
    expect([start.getHours(), start.getMinutes(), start.getSeconds(), start.getMilliseconds()]).toEqual([
      0, 0, 0, 0,
    ]);
    expect([end.getHours(), end.getMinutes(), end.getSeconds(), end.getMilliseconds()]).toEqual([
      23, 59, 59, 999,
    ]);
  });

  it('subtracts calendar days across a timezone offset transition', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 2, 30, 12));
    const prior = new Date(daysAgo(1));

    expect([prior.getFullYear(), prior.getMonth(), prior.getDate(), prior.getHours()]).toEqual([
      2026, 2, 29, 0,
    ]);
  });

  it('formats epoch values as local dates near timezone boundaries', () => {
    const local = new Date(2026, 0, 2, 0, 30);
    expect(toDateStr(String(local.getTime()))).toBe('2026-01-02');
    expect(toDateStr('')).toBe('');
  });

  it('builds exact all-time, today, and rolling preset ranges', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 4, 20, 16, 30));
    const { result } = renderHook(() => usePresets());
    const ranges = Object.fromEntries(result.current.map((preset) => [preset.label, preset.getRange()]));

    expect(ranges['All time']).toEqual(['', '']);
    expect(ranges.Today).toEqual([
      String(new Date(2026, 4, 20, 0, 0, 0, 0).getTime()),
      String(new Date(2026, 4, 20, 23, 59, 59, 999).getTime()),
    ]);
    expect(new Date(Number(ranges['Last 7 days'][0])).getDate()).toBe(13);
    act(() => vi.setSystemTime(new Date(2026, 4, 21, 8)));
    expect(result.current.find((preset) => preset.label === 'Today')?.getRange()[0]).toBe(
      String(new Date(2026, 4, 21).getTime()),
    );
  });
});
