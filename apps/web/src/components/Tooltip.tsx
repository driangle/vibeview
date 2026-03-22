import { useCallback, useRef, useState } from 'react';

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

export function useTooltip() {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const show = useCallback((e: React.MouseEvent, text: string) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setTooltip({ text, x: rect.left + rect.width / 2, y: rect.top });
  }, []);

  const hide = useCallback(() => setTooltip(null), []);

  return { tooltip, containerRef, show, hide };
}
