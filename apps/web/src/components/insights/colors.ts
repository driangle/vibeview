import type { ModelUsage } from '../../types';
import { MODEL_BAND_PALETTE } from '../timeline-track/overview';

/**
 * Pure presentation helpers for the Session Insights sidebar: they shape how the
 * server-provided timeline aggregate is drawn (segment colour, per-model accent).
 * They never derive new metrics — every number comes from the Go timeline
 * payload. Bar widths reuse `barPct` from `../timeline-track/format`.
 */

/**
 * The CSS `background` for a "where the time went" segment, keyed by the
 * server-provided label. Each role maps onto a semantic theme token so light and
 * dark both follow for free. Idle ("Waiting on you") is a solid muted grey — the
 * least interesting time, so it must not be the loudest texture in the panel.
 */
export function timeSplitBackground(label: string): string {
  switch (label) {
    case 'Model generation':
      return 'var(--primary)';
    case 'Tool calls':
      return 'var(--warning)';
    case 'Subagents':
      return 'var(--info)';
    case 'Waiting on you':
      return 'color-mix(in oklch, var(--muted-fg) 45%, transparent)';
    default:
      return 'var(--muted-fg)';
  }
}

/**
 * One accent colour per model, keyed by model id in first-appearance order,
 * cycling the shared band palette. Same model → same colour as its overview-strip
 * band (both start from {@link MODEL_BAND_PALETTE}).
 */
export function assignModelColors(models: ModelUsage[]): string[] {
  const byModel = new Map<string, string>();
  return models.map((m) => {
    let color = byModel.get(m.model);
    if (!color) {
      color = MODEL_BAND_PALETTE[byModel.size % MODEL_BAND_PALETTE.length];
      byModel.set(m.model, color);
    }
    return color;
  });
}
