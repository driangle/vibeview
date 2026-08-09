import type { Exchange, TimelineInsights } from '../../types';
import { formatTimeOfDay } from './format';
import {
  assignBandColors,
  bucketColorClass,
  bucketHeightPx,
  SPARKLINE_HEIGHT_PX,
} from './overview';

interface OverviewStripProps {
  /** Session-level aggregation; supplies the sparkline buckets and model bands. */
  insights: TimelineInsights;
  /** The full exchange set, used for the clock range and the brush position. */
  exchanges: Exchange[];
  /** The selected exchange index, or null; positions the presentational brush. */
  selectedIndex: number | null;
  /** Called with an exchange index when a model band is clicked. */
  onSelectIndex: (index: number) => void;
  /** Hide the strip when false (the `showOverview` toggle). Defaults to true. */
  show?: boolean;
  /** Override the brush position (for future scroll-to-zoom wiring). */
  brushLeftPct?: number;
  brushWidthPct?: number;
}

/** The presentational brush rectangle over the sparkline, or `null` when hidden. */
function brushRange({
  exchanges,
  selectedIndex,
  brushLeftPct,
  brushWidthPct,
}: Pick<OverviewStripProps, 'exchanges' | 'selectedIndex' | 'brushLeftPct' | 'brushWidthPct'>) {
  if (brushLeftPct !== undefined && brushWidthPct !== undefined) {
    return { left: brushLeftPct, width: brushWidthPct };
  }
  const total = exchanges.length;
  const pos = selectedIndex === null ? -1 : exchanges.findIndex((e) => e.index === selectedIndex);
  if (pos < 0 || total === 0) return null;
  return { left: (pos / total) * 100, width: Math.max(2, 100 / total) };
}

/**
 * The overview strip above the Timeline Track: a token sparkline whose buckets
 * are coloured by error level, a presentational brush marking the viewed range,
 * and a model-band ribbon whose segments jump the selection to each model run's
 * first exchange. Renders only server-provided values; bar heights and colours
 * are pure presentation (see `overview.ts`).
 */
export function OverviewStrip({
  insights,
  exchanges,
  selectedIndex,
  onSelectIndex,
  show = true,
  brushLeftPct,
  brushWidthPct,
}: OverviewStripProps) {
  if (!show) return null;

  const { overviewBuckets, modelBands } = insights;
  const maxBucketTokens = Math.max(0, ...overviewBuckets.map((b) => b.tokens));
  const bandColors = assignBandColors(modelBands);
  const brush = brushRange({ exchanges, selectedIndex, brushLeftPct, brushWidthPct });

  // The first/last exchanges can carry empty timestamps, so scan inward for the
  // earliest start and latest end that actually have a clock.
  const startClock = formatTimeOfDay(exchanges.find((e) => e.startTime)?.startTime ?? '');
  const endClock = formatTimeOfDay([...exchanges].reverse().find((e) => e.endTime)?.endTime ?? '');

  return (
    <div
      className="flex flex-none items-center gap-3.5 border-b border-border px-8 py-3"
      data-testid="overview-strip"
    >
      <div className="flex w-[70px] flex-none flex-col gap-0.5">
        <span className="text-[10px] font-medium tracking-wider text-muted-fg uppercase">
          Session
        </span>
        <span className="text-[9px] text-muted-fg/70">tokens · model</span>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {/* Sparkline */}
        <div className="relative flex items-end gap-px" style={{ height: SPARKLINE_HEIGHT_PX }}>
          {overviewBuckets.map((bucket, i) => (
            <div
              key={i}
              data-testid="overview-bucket"
              className={`flex-1 rounded-[1px] ${bucketColorClass(bucket.errorLevel)}`}
              style={{ height: bucketHeightPx(bucket.tokens, maxBucketTokens) }}
            />
          ))}
          {brush && (
            <div
              data-testid="overview-brush"
              aria-hidden
              className="pointer-events-none absolute -top-[3px] -bottom-[3px] rounded-[3px] border-[1.5px] border-primary bg-primary/[0.07]"
              style={{ left: `${brush.left}%`, width: `${brush.width}%` }}
            />
          )}
        </div>

        {/* Model-band ribbon */}
        <div className="relative h-1.5 overflow-hidden rounded-full bg-secondary">
          {modelBands.map((band, i) => (
            <button
              key={i}
              type="button"
              title={`${band.model} · ${band.exchanges} ${
                band.exchanges === 1 ? 'exchange' : 'exchanges'
              }`}
              onClick={() => onSelectIndex(band.firstIndex)}
              className="absolute top-0 bottom-0 cursor-pointer"
              style={{
                left: `${band.leftPct}%`,
                width: `${band.widthPct}%`,
                backgroundColor: bandColors[i],
              }}
            />
          ))}
        </div>
      </div>

      {(startClock || endClock) && (
        <span className="flex-none font-mono text-[10px] whitespace-nowrap text-muted-fg">
          {startClock || '—'} → {endClock || '—'}
        </span>
      )}
    </div>
  );
}
