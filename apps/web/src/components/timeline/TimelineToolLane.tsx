import type { TimelineCycle, NodeLayout, LayoutConfig } from '../../lib/timeline/types';
import type { ContentBlockInput } from '../../types';
import { getPhaseTheme } from '../../lib/timeline/phaseTheme';
import { ToolGlyph } from './ToolGlyph';

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
const GLYPH_SPACING = 14;
const GLYPHS_PER_ROW = 4;
const ROW_HEIGHT = 14;
const MAX_VISIBLE_GLYPHS = 8;
const GLYPH_SIZE = 5;

function toolSummary(name: string, input?: ContentBlockInput): string {
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
