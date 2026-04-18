/** Simple distinct glyph shapes per tool type. */
export function ToolGlyph({
  tool,
  x,
  y,
  size,
  color,
  opacity,
  tooltip,
  onHover,
}: {
  tool: string;
  tooltip: string;
  onHover?: (summary: string | null, event?: React.PointerEvent<SVGGElement>) => void;
  x: number;
  y: number;
  size: number;
  color: string;
  opacity: number;
}) {
  const s = size;
  const props = { fill: color, opacity };

  let shape: React.ReactNode;
  switch (tool) {
    case 'Edit':
      shape = (
        <polygon points={`${x},${y - s} ${x + s},${y} ${x},${y + s} ${x - s},${y}`} {...props} />
      );
      break;
    case 'Write':
      shape = <rect x={x - s * 0.8} y={y - s * 0.8} width={s * 1.6} height={s * 1.6} {...props} />;
      break;
    case 'Bash':
      shape = (
        <polygon
          points={`${x},${y - s} ${x + s},${y + s * 0.7} ${x - s},${y + s * 0.7}`}
          {...props}
        />
      );
      break;
    case 'Read':
      shape = <ellipse cx={x} cy={y} rx={s} ry={s * 0.6} {...props} />;
      break;
    case 'Grep':
    case 'Glob':
      shape = (
        <circle
          cx={x}
          cy={y}
          r={s * 0.8}
          fill="none"
          stroke={color}
          strokeWidth={1.2}
          opacity={opacity}
        />
      );
      break;
    case 'Agent':
      shape = (
        <>
          <polygon
            points={`${x},${y - s} ${x + s * 0.8},${y + s * 0.5} ${x - s * 0.8},${y + s * 0.5}`}
            {...props}
          />
          <polygon
            points={`${x},${y + s} ${x + s * 0.8},${y - s * 0.5} ${x - s * 0.8},${y - s * 0.5}`}
            {...props}
          />
        </>
      );
      break;
    default:
      shape = <circle cx={x} cy={y} r={s * 0.7} {...props} />;
  }

  return (
    <g
      style={{ cursor: 'pointer', pointerEvents: 'all' }}
      onPointerEnter={onHover ? (e) => onHover(tooltip, e) : undefined}
      onPointerLeave={onHover ? () => onHover(null) : undefined}
    >
      {/* Invisible hit area for hover */}
      <circle cx={x} cy={y} r={s + 4} fill="transparent" />
      {shape}
    </g>
  );
}
