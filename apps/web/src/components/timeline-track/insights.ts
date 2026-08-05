import type { ModelUsage } from '../../types';
import { MODEL_BAND_PALETTE } from './overview';

/**
 * Pure presentation helpers for the Session insights popover: they shape how the
 * server-provided `TimelineInsights` aggregate is drawn (segment colour, per-model
 * accent). They never derive new metrics — every number comes from the Go
 * timeline payload. Bar widths reuse `barPct` from `./format`.
 */

/**
 * The CSS `background` for a "where the time went" segment, keyed by the
 * server-provided label. Semantic accents with no theme token, so these literals
 * are the single source of truth (mirroring the designer's palette). "Waiting on
 * you" renders as a hatch so idle time reads distinctly from active work.
 */
export function timeSplitBackground(label: string): string {
  switch (label) {
    case 'Model generation':
      return 'hsl(220 100% 55% / 0.65)';
    case 'Tool calls':
      return 'hsl(35 90% 50% / 0.7)';
    case 'Subagents':
      return 'hsl(188 80% 45% / 0.75)';
    case 'Waiting on you':
      return 'repeating-linear-gradient(45deg, hsl(220 14% 82%) 0 3px, transparent 3px 6px)';
    default:
      return 'hsl(220 14% 70%)';
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
