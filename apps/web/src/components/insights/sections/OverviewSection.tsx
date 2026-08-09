import type { TimelineResponse } from '../../../types';
import { formatDurationMs } from '../../../utils';
import { SidebarSection } from '../../SidebarSection';
import type { InsightsActions } from '../actions';
import { timeSplitBackground } from '../colors';
import { Tile } from '../widgets';

/**
 * The lead section: the "where the time went" split bar + legend and the three
 * headline tiles (errors / longest run / token share). Sourced entirely from the
 * server-provided timeline aggregate; the tiles run the tab-aware jump actions.
 */
export function OverviewSection({
  timeline,
  actions,
}: {
  timeline: TimelineResponse;
  actions: InsightsActions;
}) {
  const { insights, exchanges } = timeline;
  const { timeSplit, errorCount, longestExchangeIndex, top5TokenSharePct } = insights;

  const totalLabel = formatDurationMs(insights.totalSpanMs);
  const longest = exchanges.find((e) => e.index === longestExchangeIndex);
  const longestLabel = longest ? formatDurationMs(longest.durationMs) : '—';

  return (
    <SidebarSection
      id="overview"
      icon="schedule"
      title="Overview"
      meta={totalLabel}
      defaultCollapsed={false}
    >
      <div className="flex flex-col gap-4">
        {/* Where the time went */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-medium tracking-wider text-muted-fg uppercase">
            Where the {totalLabel} went
          </span>
          <div className="flex h-2.5 overflow-hidden rounded-full bg-secondary">
            {timeSplit.map((seg) => (
              <div
                key={seg.label}
                style={{ width: `${seg.pct}%`, background: timeSplitBackground(seg.label) }}
              />
            ))}
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
            {timeSplit.map((seg) => (
              <span key={seg.label} className="flex items-center gap-1.5 text-[10px] text-muted-fg">
                <span
                  className="h-[7px] w-[7px] flex-none rounded-sm"
                  style={{ background: timeSplitBackground(seg.label) }}
                  aria-hidden
                />
                <span>{seg.label}</span>
                <span className="ml-auto font-mono text-fg">
                  {formatDurationMs(seg.durationMs)}
                </span>
              </span>
            ))}
          </div>
        </div>

        {/* Headline tiles. The error tile is red only when there are errors. */}
        <div className="flex gap-2">
          <Tile
            value={`${errorCount}`}
            caption="errors"
            onClick={actions.onJumpToFirstError}
            destructive={errorCount > 0}
          />
          <Tile
            value={longestLabel}
            caption={`longest · #${longestExchangeIndex + 1}`}
            onClick={actions.onJumpToLongest}
          />
          <Tile
            value={`${top5TokenSharePct}%`}
            caption="tokens · top 5"
            onClick={actions.onJumpToCostliest}
          />
        </div>
      </div>
    </SidebarSection>
  );
}
