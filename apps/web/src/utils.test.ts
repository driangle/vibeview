import { describe, it, expect } from 'vitest';
import { formatDurationMs, formatClock } from './utils';

describe('formatDurationMs', () => {
  it('renders sub-second durations as "<1s"', () => {
    expect(formatDurationMs(0)).toBe('<1s');
    expect(formatDurationMs(999)).toBe('<1s');
  });

  it('renders whole seconds under a minute', () => {
    expect(formatDurationMs(1000)).toBe('1s');
    expect(formatDurationMs(45_000)).toBe('45s');
    expect(formatDurationMs(59_999)).toBe('59s');
  });

  it('renders minutes, appending seconds only when non-zero', () => {
    expect(formatDurationMs(60_000)).toBe('1m');
    expect(formatDurationMs(200_000)).toBe('3m 20s');
  });

  it('renders hours and minutes past an hour', () => {
    expect(formatDurationMs(3_600_000)).toBe('1h 0m');
    expect(formatDurationMs(3_900_000)).toBe('1h 5m');
  });
});

describe('formatClock', () => {
  it('renders mm:ss under an hour, zero-padded', () => {
    expect(formatClock(0)).toBe('00:00');
    expect(formatClock(5_000)).toBe('00:05');
    expect(formatClock(65_000)).toBe('01:05');
    expect(formatClock(600_000)).toBe('10:00');
  });

  it('renders h:mm:ss once past an hour', () => {
    expect(formatClock(3_600_000)).toBe('1:00:00');
    expect(formatClock(3_665_000)).toBe('1:01:05');
  });

  it('clamps negative offsets to zero', () => {
    expect(formatClock(-5_000)).toBe('00:00');
  });
});
