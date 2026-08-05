import { Fragment } from 'react';
import type { TimelineResponse } from '../../types';
import { TrackColumnHeader } from './TrackColumnHeader';
import { TrackRow, type Density } from './TrackRow';
import { IdleDivider } from './IdleDivider';
import { TrackEmptyState } from './TrackEmptyState';
import { IDLE_DIVIDER_MIN_MS } from './format';

interface TimelineTrackProps {
  timeline: TimelineResponse | null;
  /** Index of the selected exchange, or null when none is selected. */
  selectedIndex: number | null;
  /** Called with an exchange index when its row is clicked. */
  onSelectIndex: (index: number) => void;
  density?: Density;
  /** Clears filters/search from the empty state (wired in a later task). */
  onReset?: () => void;
}

/**
 * The Timeline Track: a scrollable table of exchange rows under a sticky column
 * header, with dashed idle dividers between gapped exchanges and an empty state
 * when nothing matches. Renders only the server-provided exchange values; bar
 * widths are scaled against the row-set maxima computed here.
 */
export function TimelineTrack({
  timeline,
  selectedIndex,
  onSelectIndex,
  density = 'comfortable',
  onReset,
}: TimelineTrackProps) {
  const exchanges = timeline?.exchanges ?? [];
  const maxDurationMs = Math.max(0, ...exchanges.map((e) => e.durationMs));
  const maxTokens = Math.max(0, ...exchanges.map((e) => e.tokens));

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-card" data-testid="timeline-track">
      <TrackColumnHeader />
      <div className="flex-1 overflow-y-auto">
        {exchanges.length === 0 ? (
          <TrackEmptyState onReset={onReset} />
        ) : (
          exchanges.map((exchange) => (
            <Fragment key={exchange.index}>
              {exchange.idleBeforeMs >= IDLE_DIVIDER_MIN_MS && (
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
