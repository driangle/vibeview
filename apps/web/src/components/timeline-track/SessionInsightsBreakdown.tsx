import type { TimelineInsights } from '../../types';
import { formatCost, formatDurationMs, formatTokenCount } from '../../utils';
import { barPct } from './format';
import { assignModelColors } from './insights';
import { MeterRow, SectionLabel } from './insightsWidgets';

interface BreakdownProps {
  insights: TimelineInsights;
  /** Set the track's search query (file/command/skill/tool/model row clicks). */
  onSearch: (query: string) => void;
}

/**
 * The list half of the Session insights popover: per-model rows, busiest files,
 * most-run commands, skills chips, and tool-mix chips. Each entry is a click
 * target that filters the track by its name. Empty sections are omitted. Purely
 * presentational; every value comes from the server-provided `TimelineInsights`.
 */
export function SessionInsightsBreakdown({ insights, onSearch }: BreakdownProps) {
  const { models, modelSwitches, busiestFiles, topCommands, skills, toolMix } = insights;

  const modelColors = assignModelColors(models);
  const maxModelTokens = Math.max(0, ...models.map((m) => m.tokens));
  const maxFileCount = Math.max(0, ...busiestFiles.map((f) => f.count));
  const maxCommandCount = Math.max(0, ...topCommands.map((c) => c.count));

  return (
    <>
      {models.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <SectionLabel meta={`${modelSwitches} model switch${modelSwitches === 1 ? '' : 'es'}`}>
            Models used
          </SectionLabel>
          {models.map((m, i) => (
            <MeterRow
              key={m.model}
              onClick={() => onSearch(m.model)}
              barColor={modelColors[i]}
              pct={barPct(m.tokens, maxModelTokens)}
              left={
                <>
                  <span
                    className="h-2 w-2 flex-none rounded-sm"
                    style={{ background: modelColors[i] }}
                    aria-hidden
                  />
                  <span className="w-[86px] flex-none truncate text-[11px] font-medium text-fg">
                    {m.model}
                  </span>
                </>
              }
              right={
                <span className="flex-none font-mono text-[10px] whitespace-nowrap text-muted-fg">
                  {formatTokenCount(m.tokens)} · {formatDurationMs(m.durationMs)} ·{' '}
                  {formatCost(m.costUSD)}
                </span>
              }
            />
          ))}
        </div>
      )}

      {busiestFiles.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <SectionLabel>Busiest files</SectionLabel>
          {busiestFiles.map((f) => (
            <MeterRow
              key={f.name}
              onClick={() => onSearch(f.name)}
              barColor="hsl(220 100% 55% / 0.55)"
              pct={barPct(f.count, maxFileCount)}
              left={
                <span className="w-[132px] flex-none truncate font-mono text-[10.5px] text-fg">
                  {f.name}
                </span>
              }
              right={
                <span className="w-[68px] flex-none text-right font-mono text-[10px] whitespace-nowrap text-muted-fg">
                  {f.count} {f.count === 1 ? 'touch' : 'touches'}
                </span>
              }
            />
          ))}
        </div>
      )}

      {topCommands.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <SectionLabel>Most-run commands</SectionLabel>
          {topCommands.map((c) => (
            <MeterRow
              key={c.name}
              onClick={() => onSearch(c.name)}
              barColor="hsl(35 90% 50% / 0.6)"
              pct={barPct(c.count, maxCommandCount)}
              left={
                <span className="w-[172px] flex-none truncate font-mono text-[10.5px] text-fg">
                  <span className="text-muted-fg">$ </span>
                  {c.name}
                </span>
              }
              right={
                <span className="w-8 flex-none text-right font-mono text-[10px] text-muted-fg">
                  {c.count}×
                </span>
              }
            />
          ))}
        </div>
      )}

      {skills.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <SectionLabel>Skills loaded</SectionLabel>
          <div className="flex flex-wrap gap-1.5">
            {skills.map((s) => (
              <button
                key={s.name}
                type="button"
                onClick={() => onSearch(s.name)}
                className="flex items-center gap-1 rounded-full border border-[#ddd6fe] bg-[#f5f3ff] px-1.5 py-0.5 font-mono text-[10px] text-[#7c3aed] hover:bg-[#ede9fe]"
              >
                <span className="material-symbols-outlined text-[12px]">magic_button</span>/{s.name}
                <span className="text-[#a78bfa]">{s.count}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {toolMix.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <SectionLabel>Tool mix</SectionLabel>
          <div className="flex flex-wrap gap-1.5">
            {toolMix.map((t) => (
              <button
                key={t.name}
                type="button"
                onClick={() => onSearch(t.name)}
                className="flex items-center gap-1.5 rounded-full bg-secondary px-1.5 py-0.5 font-mono text-[10px] text-secondary-fg hover:bg-primary/15"
              >
                {t.name}
                <span className="text-muted-fg">{t.count}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
