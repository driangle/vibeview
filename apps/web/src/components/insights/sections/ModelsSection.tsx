import type { ModelUsage, TimelineInsights } from '../../../types';
import { formatCost, formatDurationMs, formatTokenCount } from '../../../utils';
import { barPct } from '../../timeline-track/format';
import { SidebarSection } from '../../SidebarSection';
import type { InsightsActions } from '../actions';
import { assignModelColors } from '../colors';
import { useCostUIEnabled } from '../../../hooks/useCostUIEnabled';

/**
 * A readable short label for a model id, e.g. `claude-opus-4-8` → `Opus 4.8`,
 * `claude-haiku-4-5-20251001` → `Haiku 4.5`. Falls back to the raw id when it
 * doesn't match the `claude-<family>-<version…>` shape. Pure presentation.
 */
function formatModelName(id: string): string {
  if (!id) return 'Unknown';
  const parts = id
    .replace(/^claude-/, '')
    .replace(/-\d{8}$/, '') // drop a trailing yyyymmdd date snapshot
    .split('-');
  const [family, ...version] = parts;
  if (parts.length < 2 || !family) return id;
  return `${family.charAt(0).toUpperCase()}${family.slice(1)} ${version.join('.')}`;
}

/** One card per model — a card, not a crushed row, so small numbers still read. */
function ModelCard({
  model,
  color,
  maxTokens,
  showCost,
  onClick,
}: {
  model: ModelUsage;
  color: string;
  maxTokens: number;
  showCost: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full flex-col gap-1.5 rounded-lg border border-border bg-card px-2.5 py-2 text-left hover:bg-secondary"
    >
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 flex-none rounded-sm" style={{ background: color }} aria-hidden />
        <span className="min-w-0 flex-1 truncate text-xs font-medium text-fg">
          {formatModelName(model.model)}
        </span>
        {showCost && (
          <span className="flex-none font-mono text-[11px] text-fg">
            {formatCost(model.costUSD)}
          </span>
        )}
      </div>
      <div className="h-[5px] rounded-full bg-secondary">
        <div
          className="h-[5px] rounded-full"
          style={{ background: color, width: `${barPct(model.tokens, maxTokens)}%` }}
        />
      </div>
      <div className="flex gap-2.5 font-mono text-[10px] text-muted-fg">
        <span>{model.exchanges}×</span>
        <span>{formatTokenCount(model.tokens)}</span>
        <span>{formatDurationMs(model.durationMs)}</span>
      </div>
    </button>
  );
}

/**
 * Per-model breakdown: one card per model used. Clicking a card runs the
 * tab-aware entity action (filter the track by the model, or switch to the
 * Timeline and filter).
 */
export function ModelsSection({
  insights,
  actions,
}: {
  insights: TimelineInsights;
  actions: InsightsActions;
}) {
  const { models, modelSwitches } = insights;
  const showCost = useCostUIEnabled();
  if (models.length === 0) return null;

  const colors = assignModelColors(models);
  const maxTokens = Math.max(1, ...models.map((m) => m.tokens));

  return (
    <SidebarSection
      id="models"
      icon="graph_3"
      title="Models"
      count={models.length}
      meta={`${modelSwitches} switch${modelSwitches === 1 ? '' : 'es'}`}
    >
      <div className="flex flex-col gap-2">
        {models.map((m, i) => (
          <ModelCard
            key={m.model}
            model={m}
            color={colors[i]}
            maxTokens={maxTokens}
            showCost={showCost}
            onClick={() => actions.onEntity({ query: m.model })}
          />
        ))}
      </div>
    </SidebarSection>
  );
}
