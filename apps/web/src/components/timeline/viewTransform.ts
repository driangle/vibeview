export interface ViewTransform {
  x: number;
  y: number;
  scale: number;
}

export const MIN_SCALE = 0.2;
export const MAX_SCALE = 3;
export const ZOOM_STEP = 0.03;
export const FIT_PADDING = 40;

export function computeFitTransform(
  containerW: number,
  containerH: number,
  contentW: number,
  contentH: number,
): ViewTransform {
  if (containerW === 0 || containerH === 0 || contentW === 0 || contentH === 0) {
    return { x: 0, y: 0, scale: 1 };
  }

  const scaleX = (containerW - FIT_PADDING * 2) / contentW;
  const scaleY = (containerH - FIT_PADDING * 2) / contentH;
  const scale = Math.min(Math.min(scaleX, scaleY), MAX_SCALE);

  // Center content vertically, align left with padding horizontally
  const scaledW = contentW * scale;
  const scaledH = contentH * scale;
  const x = Math.max(FIT_PADDING, (containerW - scaledW) / 2);
  const y = Math.max(FIT_PADDING, (containerH - scaledH) / 2);

  return { x, y, scale };
}
