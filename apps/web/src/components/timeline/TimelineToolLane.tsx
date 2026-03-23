import type { TimelineCycle, NodeLayout, LayoutConfig } from '../../lib/timeline/types';
import { getPhaseTheme } from '../../lib/timeline/phaseTheme';

interface TimelineToolLaneProps {
  cycles: TimelineCycle[];
  nodeLayouts: NodeLayout[];
  config: LayoutConfig;
  onGlyphHover?: (summary: string | null, event?: React.PointerEvent<SVGGElement>) => void;
}

interface ToolCall {
  name: string;
  summary: string;
}

const LANE_OFFSET_Y = 65;
const GLYPH_SIZE = 5;
const GLYPH_SPACING = 14;
const GLYPHS_PER_ROW = 4;
const ROW_HEIGHT = 14;
const MAX_VISIBLE_GLYPHS = 8;

function toolSummary(name: string, input?: Record<string, unknown>): string {
  if (!input) return name;
  switch (name) {
    case 'Edit':
    case 'Write':
    case 'Read': {
      const fp = input.file_path as string | undefined;
      return fp ? `${name}: ${fp.split('/').pop()}` : name;
    }
    case 'Bash': {
      const cmd = input.command as string | undefined;
      return cmd ? `Bash: ${cmd.length > 60 ? cmd.slice(0, 60) + '…' : cmd}` : 'Bash';
    }
    case 'Grep': {
      const pat = input.pattern as string | undefined;
      return pat ? `Grep: ${pat}` : 'Grep';
    }
    case 'Glob': {
      const pat = input.pattern as string | undefined;
      return pat ? `Glob: ${pat}` : 'Glob';
    }
    case 'Agent': {
      const desc = input.description as string | undefined;
      return desc ? `Agent: ${desc}` : 'Agent';
    }
    default:
      return name;
  }
}

function extractToolCalls(cycle: TimelineCycle): ToolCall[] {
  const calls: ToolCall[] = [];
  for (const msg of cycle.assistantMessages) {
    if (!msg.message) continue;
    const content = msg.message.content;
    if (!Array.isArray(content)) continue;
    for (const b of content) {
      if (b.type === 'tool_use' && b.name) {
        calls.push({
          name: b.name,
          summary: toolSummary(b.name, b.input),
        });
      }
    }
  }
  return calls;
}

/** Simple distinct glyph shapes per tool type. */
function ToolGlyph({
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

export function TimelineToolLane({
  cycles,
  nodeLayouts,
  config,
  onGlyphHover,
}: TimelineToolLaneProps) {
  const laneY = config.mainPathY + LANE_OFFSET_Y;

  return (
    <g>
      {cycles.map((cycle, i) => {
        const tools = extractToolCalls(cycle);
        if (tools.length === 0) return null;

        const nodeX = nodeLayouts[i].x;
        const theme = getPhaseTheme(cycle.phase);

        const visible = tools.slice(0, MAX_VISIBLE_GLYPHS);
        const overflow = tools.length - visible.length;

        return (
          <g key={i}>
            {visible.map((tool, j) => {
              const col = j % GLYPHS_PER_ROW;
              const row = Math.floor(j / GLYPHS_PER_ROW);
              const rowCount = Math.min(visible.length - row * GLYPHS_PER_ROW, GLYPHS_PER_ROW);
              const rowStartX = nodeX - ((rowCount - 1) * GLYPH_SPACING) / 2;
              return (
                <ToolGlyph
                  key={j}
                  tool={tool.name}
                  tooltip={tool.summary}
                  onHover={onGlyphHover}
                  x={rowStartX + col * GLYPH_SPACING}
                  y={laneY + row * ROW_HEIGHT}
                  size={GLYPH_SIZE}
                  color={theme.fill}
                  opacity={0.8}
                />
              );
            })}
            {overflow > 0 && (
              <text
                x={nodeX}
                y={laneY + Math.ceil(visible.length / GLYPHS_PER_ROW) * ROW_HEIGHT + 2}
                textAnchor="middle"
                fontSize={8}
                fill={theme.fill}
                opacity={0.5}
              >
                +{overflow}
              </text>
            )}
          </g>
        );
      })}
    </g>
  );
}
