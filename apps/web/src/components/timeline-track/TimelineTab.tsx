import type { Exchange, TimelineResponse } from '../../types';
import { TimelineToolbar } from './TimelineToolbar';
import { TimelineTrack } from './TimelineTrack';
import { OverviewStrip } from './OverviewStrip';
import { ExchangeDetailPanel } from './ExchangeDetailPanel';
import { useTimelineKeyboard } from './useTimelineKeyboard';
import type { TimelineController } from './useTimeline';
import type { SessionMessageContext } from './exchangeData';
import type { Density } from './TrackRow';

interface TimelineTabProps {
  timeline: TimelineResponse | null;
  /** The shared timeline state and actions; owned by the parent (see {@link useTimeline}). */
  controller: TimelineController;
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
 * The Timeline tab: composes the toolbar, the overview strip, the track, and the
 * detail panel, plus the scoped keyboard navigation. All timeline state (query,
 * filters, selection, visible exchanges) lives in the shared
 * {@link TimelineController} so the sidebar's insights can drive the same track.
 */
export function TimelineTab({
  timeline,
  controller,
  onClose,
  onOpenInConversation,
  messageContext,
  density,
  showOverview = true,
}: TimelineTabProps) {
  const {
    allExchanges,
    visible,
    filters,
    toggleFilter,
    clearSearch,
    reset,
    step,
    shownLabel,
    matched,
    matchPos,
    showIdleGaps,
    selectedIndex,
    onSelectIndex,
    selectedExchange,
  } = controller;

  useTimelineKeyboard({
    enabled: allExchanges.length > 0,
    visibleExchanges: visible,
    selectedIndex,
    onSelectIndex,
    onClearSearch: clearSearch,
  });

  const showPanel = selectedExchange !== undefined && messageContext !== undefined;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <TimelineToolbar
        exchanges={allExchanges}
        filters={filters}
        onToggleFilter={toggleFilter}
        shownLabel={shownLabel}
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
