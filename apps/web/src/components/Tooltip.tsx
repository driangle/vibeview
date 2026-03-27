export interface TooltipState {
  text: string;
  x: number;
  y: number;
}

export function Tooltip({ text, x, y }: TooltipState) {
  return (
    <div
      className="pointer-events-none fixed z-50 rounded bg-fg px-2 py-1 text-xs text-bg shadow-lg"
      style={{ left: x, top: y - 32 }}
    >
      {text}
    </div>
  );
}
