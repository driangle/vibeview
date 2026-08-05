/**
 * Display helpers and presentation thresholds for the Timeline Track. These
 * shape how server-provided metrics are drawn (bar width, bar colour, divider
 * visibility); they never derive new metrics — the numbers themselves come from
 * the Go timeline payload.
 */

/**
 * An exchange whose active duration is at or above this renders an amber
 * elapsed bar instead of the default blue, flagging a long-running run.
 */
export const LONG_EXCHANGE_MS = 2 * 60 * 1000;

/**
 * The minimum idle gap before an exchange that surfaces an idle divider. Gaps
 * shorter than this (the seconds between rapid back-to-back exchanges) are left
 * out so the track stays readable.
 */
export const IDLE_DIVIDER_MIN_MS = 30 * 1000;

/** Format an ISO timestamp as a local `HH:MM` clock; `''` for empty/invalid input. */
export function formatTimeOfDay(iso: string): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

/**
 * A value's share of the row-set maximum, clamped to 0–100, for scaling the
 * elapsed and token bars. Returns 0 when there is no positive maximum.
 */
export function barPct(value: number, max: number): number {
  if (max <= 0) return 0;
  return Math.max(0, Math.min(100, (value / max) * 100));
}
