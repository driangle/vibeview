import { useCallback, useRef, useState } from 'react';
import type { TooltipState } from './Tooltip';

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
