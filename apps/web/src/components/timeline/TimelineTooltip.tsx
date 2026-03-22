import type { TimelineCycle } from '../../lib/timeline/types';
import { getPhaseTheme } from '../../lib/timeline/phaseTheme';

interface TimelineTooltipProps {
  cycle: TimelineCycle;
  position: { x: number; y: number };
}

function formatDuration(ms: number): string {
  if (ms < 1000) return '<1s';
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return remaining > 0 ? `${minutes}m ${remaining}s` : `${minutes}m`;
}

function formatCost(usd: number): string {
  if (usd === 0) return '$0.00';
  if (usd < 0.01) return '<$0.01';
  return `$${usd.toFixed(2)}`;
}

export function TimelineTooltip({ cycle, position }: TimelineTooltipProps) {
  const theme = getPhaseTheme(cycle.phase);
  const toolCount = cycle.features.toolNames.size;

  return (
    <div
      className="pointer-events-none fixed z-50 min-w-[200px] max-w-[300px] rounded-lg bg-card p-3 text-sm shadow-lg ring-1 ring-fg/10"
      style={{ left: position.x, top: position.y - 8, transform: 'translate(-50%, -100%)' }}
    >
      {/* Prompt preview */}
      {cycle.promptPreview && <p className="mb-2 line-clamp-2 text-fg">{cycle.promptPreview}</p>}

      {/* Stats row */}
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-secondary">
        <span className="inline-flex items-center gap-1 font-medium" style={{ color: theme.fill }}>
          {theme.label}
        </span>
        {toolCount > 0 && (
          <span>
            {toolCount} tool{toolCount !== 1 ? 's' : ''}
          </span>
        )}
        {cycle.costUSD > 0 && <span>{formatCost(cycle.costUSD)}</span>}
        {cycle.durationMs > 0 && <span>{formatDuration(cycle.durationMs)}</span>}
      </div>

      {/* Files touched */}
      {cycle.filesTouched.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {cycle.filesTouched.slice(0, 3).map((f) => (
            <span
              key={f}
              className="truncate rounded bg-secondary/20 px-1.5 py-0.5 text-[10px] text-secondary"
            >
              {f.split('/').pop()}
            </span>
          ))}
          {cycle.filesTouched.length > 3 && (
            <span className="text-[10px] text-secondary">
              +{cycle.filesTouched.length - 3} more
            </span>
          )}
        </div>
      )}
    </div>
  );
}
