import type { Exchange } from '../../types';
import { CHIP_SPECS, type FilterState, type TimelineFilterKey } from './chips';
import { TimelineSearch } from './TimelineSearch';

interface TimelineToolbarProps {
  /** The full exchange set, used for the per-chip counts (independent of filters). */
  exchanges: Exchange[];
  filters: FilterState;
  onToggleFilter: (key: TimelineFilterKey) => void;
  /** e.g. `"42 exchanges"` or `"7 of 42"`. */
  shownLabel: string;
  query: string;
  onQueryChange: (value: string) => void;
  matchLabel: string;
  onSearchPrev: () => void;
  onSearchNext: () => void;
  onClearSearch: () => void;
}

/** A single keyboard-hint key cap, e.g. `j`, `e`, `↵`. */
function KeyHint({ children }: { children: string }) {
  return (
    <span className="rounded border border-border bg-card px-[5px] py-px font-mono text-[10px] text-muted-fg">
      {children}
    </span>
  );
}

/** One filter chip: a colour dot (or icon), its label, and the count for that flag. */
function FilterChip({
  spec,
  active,
  count,
  onToggle,
}: {
  spec: (typeof CHIP_SPECS)[number];
  active: boolean;
  count: number;
  onToggle: () => void;
}) {
  const activeStyle = active
    ? { backgroundColor: `${spec.color}22`, color: spec.color, borderColor: `${spec.color}55` }
    : undefined;

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={active}
      style={activeStyle}
      className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] transition-colors ${
        active
          ? 'font-semibold'
          : 'border-border bg-card text-muted-fg hover:bg-primary/10 hover:text-fg'
      }`}
    >
      {spec.icon ? (
        <span className="material-symbols-outlined text-[13px]">{spec.icon}</span>
      ) : (
        <span
          className="h-1.5 w-1.5 rounded-full"
          style={{ backgroundColor: spec.color }}
          aria-hidden
        />
      )}
      {spec.label} {count}
    </button>
  );
}

/**
 * The Timeline Track toolbar: the five filter chips (with live counts and active
 * styling) on the left, and on the right the search box, the shown/total label,
 * and the keyboard-hint legend. Purely presentational — filtering and counting
 * are done by the parent from the server-provided exchanges.
 */
export function TimelineToolbar({
  exchanges,
  filters,
  onToggleFilter,
  shownLabel,
  query,
  onQueryChange,
  matchLabel,
  onSearchPrev,
  onSearchNext,
  onClearSearch,
}: TimelineToolbarProps) {
  return (
    <div className="flex flex-none flex-wrap items-center gap-x-2.5 gap-y-2 border-b border-border bg-surface-dim px-5 py-2.5">
      <div className="flex flex-wrap gap-1.5">
        {CHIP_SPECS.map((spec) => (
          <FilterChip
            key={spec.key}
            spec={spec}
            active={filters[spec.key]}
            count={exchanges.filter(spec.matches).length}
            onToggle={() => onToggleFilter(spec.key)}
          />
        ))}
      </div>

      <div className="ml-auto flex items-center gap-3 text-[11px] text-muted-fg">
        <TimelineSearch
          query={query}
          onQueryChange={onQueryChange}
          matchLabel={matchLabel}
          onPrev={onSearchPrev}
          onNext={onSearchNext}
          onClear={onClearSearch}
        />
        <span className="font-mono font-medium whitespace-nowrap">{shownLabel}</span>
        <span className="h-3.5 w-px bg-border" aria-hidden />
        <div className="flex items-center gap-1.5 whitespace-nowrap">
          <KeyHint>j</KeyHint>
          <KeyHint>k</KeyHint>
          <span>move</span>
          <KeyHint>e</KeyHint>
          <span>next error</span>
          <KeyHint>↵</KeyHint>
          <span>open</span>
        </div>
      </div>
    </div>
  );
}
