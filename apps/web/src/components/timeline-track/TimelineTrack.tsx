import { Fragment } from 'react';
import type { Exchange, TimelineResponse } from '../../types';
import { TrackColumnHeader } from './TrackColumnHeader';
import { TrackRow, type Density } from './TrackRow';
import { IdleDivider } from './IdleDivider';
import { TrackEmptyState } from './TrackEmptyState';
import { IDLE_DIVIDER_MIN_MS } from './format';

interface TimelineTrackProps {
  /** The session's full timeline; its exchanges set the bar scale (row maxima). */
  timeline: TimelineResponse | null;
  /**
   * The exchanges to render — the filtered subset from the toolbar. Defaults to
   * the full set when omitted (no filtering wired). Bars still scale against the
   * full set so widths stay stable as filters narrow the list.
   */
  visibleExchanges?: Exchange[];
  /** Hide idle dividers while a filter or search is active (they only aid the full view). */
  showIdleGaps?: boolean;
  /** Index of the selected exchange, or null when none is selected. */
  selectedIndex: number | null;
  /** Called with an exchange index when its row is clicked. */
  onSelectIndex: (index: number) => void;
  density?: Density;
  /** Clears filters/search from the empty state. */
  onReset?: () => void;
}

/**
 * The Timeline Track: a scrollable table of exchange rows under a sticky column
 * header, with dashed idle dividers between gapped exchanges and an empty state
 * when nothing matches. Renders only the server-provided exchange values; bar
 * widths are scaled against the full-session maxima computed here.
 */
export function TimelineTrack({
  timeline,
  visibleExchanges,
  showIdleGaps = true,
  selectedIndex,
  onSelectIndex,
  density = 'comfortable',
  onReset,
}: TimelineTrackProps) {
  const allExchanges = timeline?.exchanges ?? [];
  const rows = visibleExchanges ?? allExchanges;
  const maxDurationMs = Math.max(0, ...allExchanges.map((e) => e.durationMs));
  const maxTokens = Math.max(0, ...allExchanges.map((e) => e.tokens));

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-card" data-testid="timeline-track">
      <TrackColumnHeader />
      <div className="flex-1 overflow-y-auto">
        {rows.length === 0 ? (
          <TrackEmptyState onReset={onReset} />
        ) : (
          rows.map((exchange) => (
            <Fragment key={exchange.index}>
              {showIdleGaps && exchange.idleBeforeMs >= IDLE_DIVIDER_MIN_MS && (
                <IdleDivider idleMs={exchange.idleBeforeMs} />
              )}
              <TrackRow
                exchange={exchange}
                selected={selectedIndex === exchange.index}
                onSelect={() => onSelectIndex(exchange.index)}
                maxDurationMs={maxDurationMs}
                maxTokens={maxTokens}
                density={density}
              />
            </Fragment>
          ))
        )}
      </div>
    </div>
  );
}
