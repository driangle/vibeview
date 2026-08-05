interface TrackEmptyStateProps {
  /**
   * Clears the active filters and search. When omitted (no filters wired yet)
   * the reset link is hidden so it never reads as a dead action.
   */
  onReset?: () => void;
}

/**
 * Shown when no exchanges match the current filters. The reset link appears
 * only once a filter/search reset handler is supplied (wired in a later task).
 */
export function TrackEmptyState({ onReset }: TrackEmptyStateProps) {
  return (
    <div
      className="flex flex-col items-center gap-2 px-5 py-20 text-muted-fg"
      data-testid="track-empty-state"
    >
      <span className="material-symbols-outlined text-[28px]">filter_alt_off</span>
      <span className="text-[13px]">No exchanges match these filters</span>
      {onReset && (
        <button type="button" onClick={onReset} className="text-xs text-primary hover:underline">
          Clear filters and search
        </button>
      )}
    </div>
  );
}
