import type { ActivityState } from '../types';

const config: Record<string, { dot: string; label: string; animate?: boolean }> = {
  working: { dot: 'bg-success', label: 'Working', animate: true },
  waiting_for_approval: { dot: 'bg-warning', label: 'Waiting for approval' },
  waiting_for_input: { dot: 'bg-info', label: 'Waiting for input' },
};

interface ActivityBadgeProps {
  state?: ActivityState;
}

export function ActivityBadge({ state }: ActivityBadgeProps) {
  if (!state || state === 'idle') return null;

  const cfg = config[state];
  if (!cfg) return null;

  return (
    <span className="inline-flex items-center gap-1.5" title={cfg.label}>
      <span
        className={`h-2 w-2 shrink-0 rounded-full ${cfg.dot} ${cfg.animate ? 'animate-pulse' : ''}`}
      />
      <span className="text-[11px] text-muted-fg whitespace-nowrap">{cfg.label}</span>
    </span>
  );
}
