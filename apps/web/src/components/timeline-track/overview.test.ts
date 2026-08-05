import { describe, it, expect } from 'vitest';
import type { ModelBand } from '../../types';
import { assignBandColors, bucketColorClass, bucketHeightPx } from './overview';

function makeBand(overrides: Partial<ModelBand> & { model: string }): ModelBand {
  return { leftPct: 0, widthPct: 10, exchanges: 1, firstIndex: 0, ...overrides };
}

describe('bucketHeightPx', () => {
  it('scales from the 4px floor to 32px against the max', () => {
    expect(bucketHeightPx(0, 100)).toBe(4); // empty bucket keeps the floor
    expect(bucketHeightPx(100, 100)).toBe(32); // tallest bucket
    expect(bucketHeightPx(50, 100)).toBe(18); // 4 + round(0.5 * 28)
  });

  it('returns the floor when there is no positive max', () => {
    expect(bucketHeightPx(0, 0)).toBe(4);
    expect(bucketHeightPx(10, 0)).toBe(4);
  });
});

describe('bucketColorClass', () => {
  it('maps error level to blue / faded red / solid red', () => {
    expect(bucketColorClass(0)).toBe('bg-primary/40');
    expect(bucketColorClass(1)).toBe('bg-destructive/50');
    expect(bucketColorClass(2)).toBe('bg-destructive');
    expect(bucketColorClass(5)).toBe('bg-destructive');
  });
});

describe('assignBandColors', () => {
  it('gives the same model the same colour and distinct models distinct colours', () => {
    const colors = assignBandColors([
      makeBand({ model: 'opus' }),
      makeBand({ model: 'sonnet' }),
      makeBand({ model: 'opus' }), // model switched back — reuse its colour
    ]);
    expect(colors[0]).toBe(colors[2]);
    expect(colors[0]).not.toBe(colors[1]);
  });

  it('returns an empty list for no bands', () => {
    expect(assignBandColors([])).toEqual([]);
  });
});
