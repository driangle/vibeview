import type { ModelBand } from '../../types';

/**
 * Pure presentation helpers for the overview strip: they shape how the
 * server-provided sparkline buckets and model bands are drawn (bar height, bar
 * colour, band colour). They never derive new metrics — token counts, error
 * levels, and band geometry come from the Go timeline payload.
 */

/** The sparkline lane's height in px; bars range from the floor up to this. */
export const SPARKLINE_HEIGHT_PX = 36;
const BAR_FLOOR_PX = 4;
const BAR_RANGE_PX = 28;

/**
 * A bucket's bar height in px, scaled from a {@link BAR_FLOOR_PX} floor up to
 * `floor + range` against the tallest bucket. Empty buckets keep the floor so
 * the sparkline reads as a continuous baseline.
 */
export function bucketHeightPx(tokens: number, maxTokens: number): number {
  if (maxTokens <= 0) return BAR_FLOOR_PX;
  return BAR_FLOOR_PX + Math.round((tokens / maxTokens) * BAR_RANGE_PX);
}

/**
 * The Tailwind background class for a bucket, by error level: 0 → blue
 * (`primary`), 1 → faded red, 2+ → solid red — mirroring the designer's palette
 * via theme tokens.
 */
export function bucketColorClass(errorLevel: number): string {
  if (errorLevel >= 2) return 'bg-destructive';
  if (errorLevel === 1) return 'bg-destructive/50';
  return 'bg-primary/40';
}

/**
 * A fixed palette for the model-band ribbon. Semantic accent colours with no
 * theme token, so these values are the single source of truth (as in `flags.ts`).
 */
const BAND_PALETTE = [
  'hsl(220 100% 55% / 0.7)', // blue
  'hsl(270 70% 60% / 0.75)', // purple
  'hsl(188 75% 45% / 0.8)', // cyan
  'hsl(35 90% 50% / 0.8)', // amber
  'hsl(142 60% 40% / 0.75)', // green
  'hsl(330 70% 55% / 0.75)', // pink
];

/**
 * One colour per band, keyed by distinct model in first-appearance order: the
 * same model always reuses its colour and distinct models get distinct colours
 * (cycling once the palette is exhausted).
 */
export function assignBandColors(bands: ModelBand[]): string[] {
  const byModel = new Map<string, string>();
  return bands.map((band) => {
    let color = byModel.get(band.model);
    if (!color) {
      color = BAND_PALETTE[byModel.size % BAND_PALETTE.length];
      byModel.set(band.model, color);
    }
    return color;
  });
}
