import type { NodeLayout } from '../../lib/timeline/types';

interface TimelineConnectionPathProps {
  nodes: NodeLayout[];
}

/**
 * Builds a smooth cubic bezier SVG path through all node center points.
 * Uses Catmull-Rom to cubic bezier conversion for natural curves.
 */
function buildSmoothPath(nodes: NodeLayout[]): string {
  if (nodes.length === 0) return '';
  if (nodes.length === 1) return `M${nodes[0].x},${nodes[0].y}`;

  // For two nodes, just draw a line
  if (nodes.length === 2) {
    return `M${nodes[0].x},${nodes[0].y} L${nodes[1].x},${nodes[1].y}`;
  }

  // Catmull-Rom spline converted to cubic bezier segments
  const points = nodes.map((n) => ({ x: n.x, y: n.y }));
  const parts: string[] = [`M${points[0].x},${points[0].y}`];

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[Math.min(points.length - 1, i + 1)];
    const p3 = points[Math.min(points.length - 1, i + 2)];

    // Catmull-Rom to cubic bezier control points (tension = 0.5)
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    parts.push(`C${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`);
  }

  return parts.join(' ');
}

export function TimelineConnectionPath({ nodes }: TimelineConnectionPathProps) {
  if (nodes.length < 2) return null;

  const pathData = buildSmoothPath(nodes);

  return (
    <g>
      {/* Shadow/glow layer */}
      <path
        d={pathData}
        fill="none"
        stroke="currentColor"
        strokeWidth={4}
        opacity={0.06}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Main path */}
      <path
        d={pathData}
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        opacity={0.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
  );
}
