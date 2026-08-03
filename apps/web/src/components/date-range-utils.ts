import { useMemo } from 'react';

export function startOfDay(date: Date): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function endOfDay(date: Date): number {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

export function daysAgo(n: number): number {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return startOfDay(d);
}

export function toDateStr(ms: string): string {
  if (!ms) return '';
  const d = new Date(Number(ms));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function formatLabel(from: string, to: string): string {
  if (!from && !to) return 'All time';
  // Presentation only: format the authoritative epoch range from the URL.
  // Do not reverse-classify it into domain presets in the browser.
  const fmt = (ms: string) =>
    new Date(Number(ms)).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const fromDate = fmt(from);
  const toDate = fmt(to);
  return fromDate === toDate ? fromDate : `${fromDate} – ${toDate}`;
}

export interface PresetDef {
  label: string;
  getRange: () => [string, string];
}

export function usePresets(): PresetDef[] {
  // These are user input shortcuts, not classification of server state.
  return useMemo(
    () => [
      { label: 'All time', getRange: (): [string, string] => ['', ''] },
      {
        label: 'Today',
        getRange: (): [string, string] => [
          String(startOfDay(new Date())),
          String(endOfDay(new Date())),
        ],
      },
      {
        label: 'Last 7 days',
        getRange: (): [string, string] => [String(daysAgo(7)), String(endOfDay(new Date()))],
      },
      {
        label: 'Last 30 days',
        getRange: (): [string, string] => [String(daysAgo(30)), String(endOfDay(new Date()))],
      },
      {
        label: 'Last 90 days',
        getRange: (): [string, string] => [String(daysAgo(90)), String(endOfDay(new Date()))],
      },
    ],
    [],
  );
}
