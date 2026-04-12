export type ViewMode = 'day' | 'week' | 'month';

export interface CellRange {
  from: number;
  to: number;
}

export const MONTH_LABELS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];
export const DAY_LABELS = ['Mon', '', 'Wed', '', 'Fri', '', ''];

export const LEVEL_CLASSES = [
  'bg-secondary',
  'bg-primary/20',
  'bg-primary/40',
  'bg-primary/60',
  'bg-primary',
];

export function intensityLevel(count: number, max: number): number {
  if (count === 0 || max === 0) return 0;
  const ratio = count / max;
  if (ratio <= 0.25) return 1;
  if (ratio <= 0.5) return 2;
  if (ratio <= 0.75) return 3;
  return 4;
}

/** Epoch ms for start of a day (local time). */
export function startOfDay(dateStr: string): number {
  const d = new Date(dateStr + 'T00:00:00');
  return d.getTime();
}

/** Epoch ms for end of a day (local time). */
export function endOfDay(dateStr: string): number {
  const d = new Date(dateStr + 'T23:59:59.999');
  return d.getTime();
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
