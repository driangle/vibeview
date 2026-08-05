import { formatDurationMs } from '../../utils';

interface IdleDividerProps {
  /** Idle gap before the following exchange, in milliseconds. */
  idleMs: number;
}

/**
 * Dashed rule shown between two exchanges separated by a meaningful idle gap,
 * with the gap duration centered. Rendered only for gaps the container deems
 * worth surfacing (see IDLE_DIVIDER_MIN_MS).
 */
export function IdleDivider({ idleMs }: IdleDividerProps) {
  return (
    <div className="flex items-center gap-2.5 py-1 pr-5 pl-[78px]" data-testid="idle-divider">
      <div className="flex-1 border-t border-dashed border-border" />
      <span className="font-mono text-[10px] text-muted-fg">idle {formatDurationMs(idleMs)}</span>
      <div className="flex-1 border-t border-dashed border-border" />
    </div>
  );
}
