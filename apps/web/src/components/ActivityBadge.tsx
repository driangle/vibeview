import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { ActivityState } from '../types';

const config: Record<string, { dot: string; label: string; tooltip: string; animate?: boolean }> = {
  working: {
    dot: 'bg-success',
    label: 'Working',
    tooltip: 'Claude is actively generating a response or executing a tool',
    animate: true,
  },
  waiting_for_approval: {
    dot: 'bg-warning',
    label: 'Waiting for approval',
    tooltip: 'Claude requested a tool use and is waiting for the user to approve it',
  },
  waiting_for_input: {
    dot: 'bg-info',
    label: 'Waiting for input',
    tooltip: 'Claude responded with text and is waiting for the user to reply',
  },
  idle: {
    dot: 'bg-muted-fg/50',
    label: 'Idle',
    tooltip: 'Session is not actively running',
  },
};

interface ActivityBadgeProps {
  state?: ActivityState;
  showIdle?: boolean;
}

export function ActivityBadge({ state, showIdle = false }: ActivityBadgeProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  if (!state || (state === 'idle' && !showIdle)) return null;

  const cfg = config[state];
  if (!cfg) return null;

  function show() {
    const rect = ref.current?.getBoundingClientRect();
    if (rect) {
      setPos({ top: rect.bottom + 4, left: rect.left });
    }
  }

  function hide() {
    setPos(null);
  }

  return (
    <span
      ref={ref}
      className="inline-flex items-center gap-1.5"
      onMouseEnter={show}
      onMouseLeave={hide}
    >
      <span
        className={`h-2 w-2 shrink-0 rounded-full ${cfg.dot} ${cfg.animate ? 'animate-pulse' : ''}`}
      />
      <span className="text-[11px] text-muted-fg whitespace-nowrap">{cfg.label}</span>
      {pos &&
        createPortal(
          <span
            style={{ top: pos.top, left: pos.left }}
            className="fixed z-50 w-max max-w-[240px] rounded-md bg-fg text-bg text-[11px] px-2.5 py-1.5 leading-snug shadow-lg pointer-events-none"
          >
            {cfg.tooltip}
          </span>,
          document.body,
        )}
    </span>
  );
}
