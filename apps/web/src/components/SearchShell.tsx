import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';

interface SearchShellProps {
  /** Accessible name + tooltip on the collapsed magnifying-glass trigger. */
  title: string;
  /**
   * Force the box open regardless of user toggling — e.g. while a query is
   * active so an externally-set filter is always visible.
   */
  forceOpen?: boolean;
  /** Called when the box collapses, so the caller can clear its query. */
  onClose?: () => void;
  /** Expanded content; receives a `close` that collapses back to the icon. */
  children: (close: () => void) => ReactNode;
}

/**
 * A collapsible search affordance: a magnifying-glass icon that expands into an
 * inline search box on click, and collapses on Escape or when the content calls
 * `close`. Focuses the first input on open. Shared by the conversation and
 * timeline searches so both behave identically in the header.
 */
export function SearchShell({ title, forceOpen = false, onClose, children }: SearchShellProps) {
  const [userOpen, setUserOpen] = useState(false);
  const open = userOpen || forceOpen;
  const containerRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => {
    setUserOpen(false);
    onClose?.();
  }, [onClose]);

  // Focus the first input when the box opens (it is mounted by the time this runs).
  useEffect(() => {
    if (!open) return;
    containerRef.current?.querySelector('input')?.focus();
  }, [open]);

  // Collapse on Escape while open.
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, close]);

  if (!open) {
    return (
      <button
        onClick={() => setUserOpen(true)}
        aria-label={title}
        className="text-muted-fg hover:text-fg transition-colors print:hidden"
        title={title}
      >
        <span className="material-symbols-outlined text-xl">search</span>
      </button>
    );
  }

  return (
    <div ref={containerRef} className="print:hidden relative">
      {children(close)}
    </div>
  );
}
