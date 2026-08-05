import { useEffect, useRef, useState } from 'react';
import type { Exchange, TimelineInsights } from '../../types';
import { SessionInsightsPopover } from './SessionInsightsPopover';

interface SessionInsightsMenuProps {
  insights: TimelineInsights;
  exchanges: Exchange[];
  onSearch: (query: string) => void;
  onJumpToFirstError: () => void;
  onJumpToLongest: () => void;
  onJumpToCostliest: () => void;
}

/**
 * The "Session insights" toolbar control: a toggle button (with a chevron that
 * tracks the open state) and the anchored {@link SessionInsightsPopover}. Owns
 * the open state and dismissal (outside click and Escape); the popover itself is
 * purely presentational. A row/tile/chip click filters or jumps the track and
 * closes the menu.
 */
export function SessionInsightsMenu({
  insights,
  exchanges,
  onSearch,
  onJumpToFirstError,
  onJumpToLongest,
  onJumpToCostliest,
}: SessionInsightsMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  /** Wrap an action so it runs and then closes the menu. */
  const andClose =
    <A extends unknown[]>(action: (...args: A) => void) =>
    (...args: A) => {
      action(...args);
      setOpen(false);
    };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={`flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] transition-colors ${
          open
            ? 'border-primary bg-primary/10 font-medium text-fg'
            : 'border-border bg-card text-muted-fg hover:text-fg'
        }`}
      >
        <span className="material-symbols-outlined text-[15px]">insights</span>
        Session insights
        <span className="material-symbols-outlined text-[15px]">
          {open ? 'expand_less' : 'expand_more'}
        </span>
      </button>

      {open && (
        <SessionInsightsPopover
          insights={insights}
          exchanges={exchanges}
          onSearch={andClose(onSearch)}
          onJumpToFirstError={andClose(onJumpToFirstError)}
          onJumpToLongest={andClose(onJumpToLongest)}
          onJumpToCostliest={andClose(onJumpToCostliest)}
        />
      )}
    </div>
  );
}
