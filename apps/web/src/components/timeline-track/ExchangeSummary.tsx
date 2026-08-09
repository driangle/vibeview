import type { Exchange } from '../../types';
import { formatCost, formatDurationMs, formatTokenCount } from '../../utils';
import { exchangeBadges } from './exchangeData';
import { useCostUIEnabled } from '../../hooks/useCostUIEnabled';

/** One of the three stat tiles (elapsed / tokens / cost). */
function StatTile({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-md bg-surface-dim px-2.5 py-2">
      <div className="text-base font-semibold text-fg">{value}</div>
      <div className="text-[10px] text-muted-fg">{label}</div>
    </div>
  );
}

/**
 * The detail panel's summary block: the prompt, the elapsed/tokens/cost stat
 * tiles, the flag/skill badges, the commands that ran, and the files touched.
 * All values come straight from the server-provided {@link Exchange}.
 */
export function ExchangeSummary({ exchange }: { exchange: Exchange }) {
  const badges = exchangeBadges(exchange);
  const showCost = useCostUIEnabled();

  return (
    <div className="flex flex-col gap-3.5 border-b border-border p-4">
      <p className="m-0 font-mono text-xs leading-relaxed break-words">
        {exchange.promptPreview || <span className="text-muted-fg">(no prompt)</span>}
      </p>

      <div className={`grid gap-2 ${showCost ? 'grid-cols-3' : 'grid-cols-2'}`}>
        <StatTile value={formatDurationMs(exchange.durationMs)} label="elapsed" />
        <StatTile value={formatTokenCount(exchange.tokens)} label="tokens" />
        {showCost && <StatTile value={formatCost(exchange.costUSD)} label="cost" />}
      </div>

      {badges.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {badges.map((badge) => (
            <span
              key={badge.label}
              className="rounded-full px-2 py-[3px] text-[11px]"
              style={{ backgroundColor: badge.bg, color: badge.fg }}
            >
              {badge.label}
            </span>
          ))}
        </div>
      )}

      {exchange.commands.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] tracking-[0.1em] text-muted-fg uppercase">Commands run</span>
          {exchange.commands.map((command) => (
            <div
              key={command}
              className="truncate rounded-md border border-border bg-surface-dim px-2 py-1.5 font-mono text-[10.5px]"
            >
              <span className="mr-1 text-muted-fg">$</span>
              {command}
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <span className="text-[10px] tracking-[0.1em] text-muted-fg uppercase">Files touched</span>
        {exchange.files.length === 0 ? (
          <span className="font-mono text-[11px] text-muted-fg">(no files touched)</span>
        ) : (
          exchange.files.map((file) => (
            <div key={file} className="truncate font-mono text-[11px] text-primary">
              {file}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
