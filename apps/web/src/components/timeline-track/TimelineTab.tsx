import { useCallback, useMemo, useState } from 'react';
import type { Exchange, TimelineResponse } from '../../types';
import { TimelineToolbar } from './TimelineToolbar';
import { TimelineTrack } from './TimelineTrack';
import { OverviewStrip } from './OverviewStrip';
import { ExchangeDetailPanel } from './ExchangeDetailPanel';
import { useTimelineKeyboard } from './useTimelineKeyboard';
import { filterExchanges } from './filterExchanges';
import { EMPTY_FILTERS, anyFilterActive, type FilterState, type TimelineFilterKey } from './chips';
import type { SessionMessageContext } from './exchangeData';
import type { Density } from './TrackRow';

interface TimelineTabProps {
  timeline: TimelineResponse | null;
  /** The selected exchange index (owned by the parent for the detail panel), or null. */
  selectedIndex: number | null;
  onSelectIndex: (index: number) => void;
  /** Clears the selection, closing the detail panel. */
  onClose?: () => void;
  /** Switch to the Conversation tab, jumping to the given exchange (best-effort). */
  onOpenInConversation?: (exchange: Exchange) => void;
  /**
   * Session messages + maps threaded into the detail panel's `MessageBubble`s.
   * When omitted, the detail panel is not rendered (e.g. before data loads).
   */
  messageContext?: SessionMessageContext;
  density?: Density;
  /** Show the overview strip above the track. Defaults to on. */
  showOverview?: boolean;
}

/**
 * The Timeline tab: owns the search query and chip filters, derives the visible
 * exchanges (a pure filter over the server-provided list), and composes the
 * toolbar, the track, and the scoped keyboard navigation. Selection is owned by
 * the parent so the detail panel can read it.
 */
export function TimelineTab({
  timeline,
  selectedIndex,
  onSelectIndex,
  onClose,
  onOpenInConversation,
  messageContext,
  density,
  showOverview = true,
}: TimelineTabProps) {
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

  /** Move the selection `delta` steps through the visible list (search prev/next). */
  const step = useCallback(
    (delta: number) => {
      if (visible.length === 0) return;
      const at = selectedIndex === null ? -1 : visible.findIndex((e) => e.index === selectedIndex);
      const nextAt = at < 0 ? 0 : Math.min(visible.length - 1, Math.max(0, at + delta));
      onSelectIndex(visible[nextAt].index);
    },
    [visible, selectedIndex, onSelectIndex],
  );

  useTimelineKeyboard({
    enabled: total > 0,
    visibleExchanges: visible,
    selectedIndex,
    onSelectIndex,
    onClearSearch: clearSearch,
  });

  const selectedExchange =
    selectedIndex === null ? undefined : allExchanges.find((e) => e.index === selectedIndex);
  const showPanel = selectedExchange !== undefined && messageContext !== undefined;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <TimelineToolbar
        exchanges={allExchanges}
        filters={filters}
        onToggleFilter={toggleFilter}
        shownLabel={shownLabel}
        query={query}
        onQueryChange={setQuery}
        matchLabel={matchLabel}
        onSearchPrev={() => step(-1)}
        onSearchNext={() => step(1)}
        onClearSearch={clearSearch}
      />
      {timeline && (
        <OverviewStrip
          insights={timeline.insights}
          exchanges={allExchanges}
          selectedIndex={selectedIndex}
          onSelectIndex={onSelectIndex}
          show={showOverview}
        />
      )}
      <div className="flex min-h-0 flex-1">
        <TimelineTrack
          timeline={timeline}
          visibleExchanges={visible}
          showIdleGaps={showIdleGaps}
          selectedIndex={selectedIndex}
          onSelectIndex={onSelectIndex}
          density={density}
          onReset={reset}
        />
        {showPanel && (
          <ExchangeDetailPanel
            exchange={selectedExchange}
            context={messageContext}
            onPrev={matchPos > 0 ? () => step(-1) : undefined}
            onNext={matchPos >= 0 && matchPos < matched - 1 ? () => step(1) : undefined}
            onClose={onClose ?? (() => undefined)}
            onOpenInConversation={() => onOpenInConversation?.(selectedExchange)}
          />
        )}
      </div>
    </div>
  );
}
