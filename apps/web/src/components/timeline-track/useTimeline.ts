import { useCallback, useMemo, useState } from 'react';
import type { Exchange, TimelineResponse } from '../../types';
import { filterExchanges } from './filterExchanges';
import { EMPTY_FILTERS, anyFilterActive, type FilterState, type TimelineFilterKey } from './chips';

interface UseTimelineOptions {
  timeline: TimelineResponse | null;
  /** The selected exchange index (owned by the parent for the detail panel), or null. */
  selectedIndex: number | null;
  onSelectIndex: (index: number) => void;
}

/**
 * The Timeline controller: owns the search query and chip filters, derives the
 * visible exchanges (a pure filter over the server-provided list) plus the
 * shown/match labels, and exposes the actions that drive the track — chip
 * toggles, search stepping, reset, and the insights jumps. Held once by the
 * parent so the Timeline tab and its sidebar share one source of truth.
 */
export interface TimelineController {
  /** The full, unfiltered exchange set. */
  allExchanges: Exchange[];
  /** The exchanges matching the current query and filters, in display order. */
  visible: Exchange[];
  query: string;
  filters: FilterState;
  setQuery: (value: string) => void;
  toggleFilter: (key: TimelineFilterKey) => void;
  clearSearch: () => void;
  reset: () => void;
  /** Move the selection `delta` steps through the visible list (search prev/next). */
  step: (delta: number) => void;
  /** e.g. `"42 exchanges"` or `"7 of 42"`. */
  shownLabel: string;
  /** e.g. `"3/7"` or `"0 results"`. */
  matchLabel: string;
  /** Count of visible (matching) exchanges. */
  matched: number;
  /** Position of the selection within the visible list, or -1. */
  matchPos: number;
  /** Whether idle gaps should be drawn (no active query or filter). */
  showIdleGaps: boolean;
  selectedIndex: number | null;
  onSelectIndex: (index: number) => void;
  /** The currently selected exchange, or undefined. */
  selectedExchange: Exchange | undefined;
  /** Insights: activate the error filter and jump to the first error exchange. */
  onJumpToFirstError: () => void;
  /** Insights: jump to the server-identified longest-running exchange. */
  onJumpToLongest: () => void;
  /** Insights: jump to the heaviest (most tokens) exchange. */
  onJumpToCostliest: () => void;
}

export function useTimeline({
  timeline,
  selectedIndex,
  onSelectIndex,
}: UseTimelineOptions): TimelineController {
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);

  const allExchanges = useMemo(() => timeline?.exchanges ?? [], [timeline]);
  const visible = useMemo(
    () => filterExchanges({ exchanges: allExchanges, query, filters }),
    [allExchanges, query, filters],
  );

  const total = allExchanges.length;
  const matched = visible.length;
  const shownLabel = matched === total ? `${total} exchanges` : `${matched} of ${total}`;

  const matchPos =
    selectedIndex === null ? -1 : visible.findIndex((e) => e.index === selectedIndex);
  const matchLabel = matched === 0 ? '0 results' : `${Math.max(0, matchPos) + 1}/${matched}`;

  const showIdleGaps = query.trim().length === 0 && !anyFilterActive(filters);

  const toggleFilter = useCallback(
    (key: TimelineFilterKey) => setFilters((prev) => ({ ...prev, [key]: !prev[key] })),
    [],
  );
  const clearSearch = useCallback(() => setQuery(''), []);
  const reset = useCallback(() => {
    setQuery('');
    setFilters(EMPTY_FILTERS);
  }, []);

  /** Clear the query and filters, then select `index` (a track jump). */
  const jumpTo = useCallback(
    (index: number | undefined) => {
      setQuery('');
      setFilters(EMPTY_FILTERS);
      if (index !== undefined && index >= 0) onSelectIndex(index);
    },
    [onSelectIndex],
  );

  const jumpToFirstError = useCallback(() => {
    setQuery('');
    setFilters({ ...EMPTY_FILTERS, errors: true });
    const first = allExchanges.find((e) => e.flags.hasErrors);
    if (first) onSelectIndex(first.index);
  }, [allExchanges, onSelectIndex]);

  const jumpToLongest = useCallback(
    () => jumpTo(timeline?.insights.longestExchangeIndex),
    [jumpTo, timeline],
  );

  const jumpToCostliest = useCallback(() => {
    const costliest = allExchanges.reduce<Exchange | undefined>(
      (max, e) => (max === undefined || e.tokens > max.tokens ? e : max),
      undefined,
    );
    jumpTo(costliest?.index);
  }, [allExchanges, jumpTo]);

  const step = useCallback(
    (delta: number) => {
      if (visible.length === 0) return;
      const at = selectedIndex === null ? -1 : visible.findIndex((e) => e.index === selectedIndex);
      const nextAt = at < 0 ? 0 : Math.min(visible.length - 1, Math.max(0, at + delta));
      onSelectIndex(visible[nextAt].index);
    },
    [visible, selectedIndex, onSelectIndex],
  );

  const selectedExchange =
    selectedIndex === null ? undefined : allExchanges.find((e) => e.index === selectedIndex);

  return {
    allExchanges,
    visible,
    query,
    filters,
    setQuery,
    toggleFilter,
    clearSearch,
    reset,
    step,
    shownLabel,
    matchLabel,
    matched,
    matchPos,
    showIdleGaps,
    selectedIndex,
    onSelectIndex,
    selectedExchange,
    onJumpToFirstError: jumpToFirstError,
    onJumpToLongest: jumpToLongest,
    onJumpToCostliest: jumpToCostliest,
  };
}
