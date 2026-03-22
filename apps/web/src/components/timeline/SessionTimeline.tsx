import { useRef, useState, useCallback, useEffect, type ReactNode } from 'react';

interface ViewTransform {
  x: number;
  y: number;
  scale: number;
}

const MIN_SCALE = 0.2;
const MAX_SCALE = 3;
const ZOOM_STEP = 0.15;

interface SessionTimelineProps {
  viewportHeight: number;
  children: ReactNode;
}

export function SessionTimeline({ viewportHeight, children }: SessionTimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [transform, setTransform] = useState<ViewTransform>({
    x: 0,
    y: 0,
    scale: 1,
  });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0, tx: 0, ty: 0 });

  // Track container size with ResizeObserver
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setContainerSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Pan handlers
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      setIsPanning(true);
      panStart.current = {
        x: e.clientX,
        y: e.clientY,
        tx: transform.x,
        ty: transform.y,
      };
      (e.target as Element).setPointerCapture(e.pointerId);
    },
    [transform.x, transform.y],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isPanning) return;
      const dx = e.clientX - panStart.current.x;
      const dy = e.clientY - panStart.current.y;
      setTransform((t) => ({
        ...t,
        x: panStart.current.tx + dx,
        y: panStart.current.ty + dy,
      }));
    },
    [isPanning],
  );

  const handlePointerUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  // Zoom via mouse wheel (zoom toward cursor position)
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const direction = e.deltaY < 0 ? 1 : -1;
    setTransform((t) => {
      const newScale = Math.min(
        MAX_SCALE,
        Math.max(MIN_SCALE, t.scale + direction * ZOOM_STEP * t.scale),
      );
      // Zoom toward cursor: adjust pan so point under cursor stays fixed
      const svgRect = svgRef.current?.getBoundingClientRect();
      if (svgRect) {
        const cursorX = e.clientX - svgRect.left;
        const cursorY = e.clientY - svgRect.top;
        const ratio = newScale / t.scale;
        return {
          scale: newScale,
          x: cursorX - ratio * (cursorX - t.x),
          y: cursorY - ratio * (cursorY - t.y),
        };
      }
      return { ...t, scale: newScale };
    });
  }, []);

  const zoomIn = useCallback(() => {
    setTransform((t) => ({
      ...t,
      scale: Math.min(MAX_SCALE, t.scale + ZOOM_STEP * t.scale),
    }));
  }, []);

  const zoomOut = useCallback(() => {
    setTransform((t) => ({
      ...t,
      scale: Math.max(MIN_SCALE, t.scale - ZOOM_STEP * t.scale),
    }));
  }, []);

  const resetZoom = useCallback(() => {
    setTransform({ x: 0, y: 0, scale: 1 });
  }, []);

  const scalePercent = Math.round(transform.scale * 100);

  return (
    <div ref={containerRef} className="relative w-full flex-1 overflow-hidden">
      <svg
        ref={svgRef}
        width={containerSize.width || '100%'}
        height={containerSize.height || viewportHeight}
        className={`select-none ${isPanning ? 'cursor-grabbing' : 'cursor-grab'}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onWheel={handleWheel}
      >
        <g transform={`translate(${transform.x}, ${transform.y}) scale(${transform.scale})`}>
          {children}
        </g>
      </svg>

      {/* Zoom controls */}
      <div className="absolute right-3 bottom-3 flex items-center gap-1 rounded-lg bg-card/90 p-1 shadow-sm backdrop-blur-sm">
        <button
          onClick={zoomOut}
          className="rounded px-2 py-0.5 text-sm text-secondary hover:bg-secondary/30 hover:text-fg"
          title="Zoom out"
        >
          -
        </button>
        <button
          onClick={resetZoom}
          className="min-w-[3rem] rounded px-1 py-0.5 text-center text-xs text-secondary hover:bg-secondary/30 hover:text-fg"
          title="Reset zoom"
        >
          {scalePercent}%
        </button>
        <button
          onClick={zoomIn}
          className="rounded px-2 py-0.5 text-sm text-secondary hover:bg-secondary/30 hover:text-fg"
          title="Zoom in"
        >
          +
        </button>
      </div>
    </div>
  );
}
