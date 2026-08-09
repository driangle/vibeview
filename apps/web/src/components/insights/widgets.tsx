import type { ReactNode } from 'react';

/**
 * Shared presentational primitives for the Session Insights sidebar: the
 * clickable meter row and the headline tile. Pure display — colours and widths
 * are passed in; they derive nothing.
 *
 * Hover archetypes used across the insights sections (keep these consistent):
 * - card rows  → `hover:bg-bg`
 * - meter rows → `hover:bg-primary/10`
 * - chips      → `hover:bg-primary/15`
 */

/**
 * One clickable meter row (models, files, commands): arbitrary left content, a
 * value-scaled bar, and arbitrary right content. Clicking runs the passed action
 * (filter the track / navigate the conversation, depending on the active tab).
 */
export function MeterRow({
  left,
  barColor,
  pct,
  right,
  onClick,
}: {
  left: ReactNode;
  barColor: string;
  pct: number;
  right: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2 rounded px-1 py-0.5 text-left hover:bg-primary/10"
    >
      {left}
      <div className="h-[7px] flex-1 overflow-hidden rounded-full bg-secondary">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: barColor }} />
      </div>
      {right}
    </button>
  );
}

/** One headline tile: a big value over a caption. Clicking runs the passed action. */
export function Tile({
  value,
  caption,
  onClick,
  destructive,
}: {
  value: string;
  caption: string;
  onClick: () => void;
  destructive?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 rounded-lg border px-2.5 py-2 text-left transition-colors ${
        destructive
          ? 'border-destructive/25 bg-destructive/[0.07] hover:bg-destructive/[0.12]'
          : 'border-border hover:bg-secondary'
      }`}
    >
      <div className={`text-base font-semibold ${destructive ? 'text-destructive' : 'text-fg'}`}>
        {value}
      </div>
      <div className="text-[10px] text-muted-fg">{caption}</div>
    </button>
  );
}
