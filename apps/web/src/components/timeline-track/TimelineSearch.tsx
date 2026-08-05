import { SearchShell } from '../SearchShell';

interface TimelineSearchProps {
  query: string;
  onQueryChange: (value: string) => void;
  /** Current match position, e.g. `"3/12"`, or `"0 results"` when nothing matches. */
  matchLabel: string;
  /** Move the selection to the previous match. */
  onPrev: () => void;
  /** Move the selection to the next match. */
  onNext: () => void;
  /** Clear the query (also runs when the box collapses). */
  onClear: () => void;
}

const ICON_BUTTON =
  'material-symbols-outlined text-[15px] text-muted-fg hover:text-fg transition-colors';

/**
 * The session search box: a collapsible magnifying-glass that expands into a text
 * input narrowing the track, with a live match counter and prev/next steppers.
 * Stays expanded while a query is active (so a filter set from the insights
 * sidebar is visible) and collapses back to the icon when cleared. The collapse
 * behaviour is shared with the conversation search via {@link ../SearchShell}.
 */
export function TimelineSearch({
  query,
  onQueryChange,
  matchLabel,
  onPrev,
  onNext,
  onClear,
}: TimelineSearchProps) {
  const hasQuery = query.length > 0;

  return (
    <SearchShell title="Search session" forceOpen={hasQuery} onClose={onClear}>
      {(close) => (
        <div className="flex w-[288px] items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 shadow-sm">
          <span className="material-symbols-outlined text-[18px] text-muted-fg">search</span>
          <input
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search session…"
            aria-label="Search session"
            className="min-w-0 flex-1 border-none bg-transparent text-sm text-fg outline-none placeholder:text-muted-fg"
          />
          {hasQuery && (
            <>
              <span className="whitespace-nowrap text-[10px] tabular-nums text-muted-fg">
                {matchLabel}
              </span>
              <div className="flex gap-0.5">
                <button
                  type="button"
                  onClick={onPrev}
                  aria-label="Previous match"
                  className={ICON_BUTTON}
                >
                  keyboard_arrow_up
                </button>
                <button
                  type="button"
                  onClick={onNext}
                  aria-label="Next match"
                  className={ICON_BUTTON}
                >
                  keyboard_arrow_down
                </button>
              </div>
            </>
          )}
          <button type="button" onClick={close} aria-label="Close search" className={ICON_BUTTON}>
            close
          </button>
        </div>
      )}
    </SearchShell>
  );
}
