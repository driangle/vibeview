import type { Exchange, TimelineInsights } from '../../types';
import { formatDurationMs } from '../../utils';
import { timeSplitBackground } from './insights';
import { SessionInsightsBreakdown } from './SessionInsightsBreakdown';
import { SectionLabel, Tile } from './insightsWidgets';

interface SessionInsightsContentProps {
  /** Session-level aggregation; every section is rendered from these values. */
  insights: TimelineInsights;
  /** The full exchange set, used only to look up the server-identified longest run. */
  exchanges: Exchange[];
  /** Set the track's search query (file/command/skill/tool/model row clicks). */
  onSearch: (query: string) => void;
  /** Activate the error filter and jump to the first error exchange. */
  onJumpToFirstError: () => void;
  /** Jump to the longest-running exchange. */
  onJumpToLongest: () => void;
  /** Jump to the heaviest (most tokens) exchange. */
  onJumpToCostliest: () => void;
}

/**
 * The Session insights body: every section of the server-provided
 * `TimelineInsights` — the "where the time went" split bar and legend, the three
 * headline tiles, and (via {@link SessionInsightsBreakdown}) the per-model rows,
 * busiest files, most-run commands, skills chips, and tool-mix chips. Every
 * row/tile/chip click filters or jumps the track. Purely presentational: it
 * derives no metrics, only formats and colours the payload (see `insights.ts`).
 * Shared by the Timeline sidebar and any anchored container.
 */
export function SessionInsightsContent({
  insights,
  exchanges,
  onSearch,
  onJumpToFirstError,
  onJumpToLongest,
  onJumpToCostliest,
}: SessionInsightsContentProps) {
  const {
    timeSplit,
    errorCount,
    longestExchangeIndex,
    top5TokenSharePct,
    totalDurationMs,
    totalIdleMs,
  } = insights;

  const totalLabel = formatDurationMs(totalDurationMs + totalIdleMs);
  const activeLabel = formatDurationMs(totalDurationMs);

  const longest = exchanges.find((e) => e.index === longestExchangeIndex);
  const longestLabel = longest ? formatDurationMs(longest.durationMs) : '—';

  return (
    <div className="flex flex-col gap-4">
      {/* Where the time went */}
      <div className="flex flex-col gap-1.5">
        <SectionLabel meta={`${activeLabel} active`}>Where the {totalLabel} went</SectionLabel>
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
              <span className="ml-auto font-mono text-fg">{formatDurationMs(seg.durationMs)}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Headline tiles */}
      <div className="flex gap-2">
        <Tile
          value={`${errorCount}`}
          caption="errors · jump to first"
          onClick={onJumpToFirstError}
          destructive
        />
        <Tile
          value={longestLabel}
          caption={`longest run · #${longestExchangeIndex + 1}`}
          onClick={onJumpToLongest}
        />
        <Tile
          value={`${top5TokenSharePct}%`}
          caption="tokens in top 5"
          onClick={onJumpToCostliest}
        />
      </div>

      <SessionInsightsBreakdown insights={insights} onSearch={onSearch} />
    </div>
  );
}
