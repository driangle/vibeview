import type { TimelinePhase, PhaseRegionLayout } from '../../lib/timeline/types';
import { getPhaseTheme } from '../../lib/timeline/phaseTheme';

interface TimelinePhaseRegionProps {
  phase: TimelinePhase;
  layout: PhaseRegionLayout;
  isHighlighted?: boolean;
  onClick?: (phase: TimelinePhase) => void;
}

const CORNER_RADIUS = 8;
const LABEL_OFFSET_Y = 16;

export function TimelinePhaseRegion({
  phase,
  layout,
  isHighlighted,
  onClick,
}: TimelinePhaseRegionProps) {
  const theme = getPhaseTheme(phase.phase);
  const { x, y, width, height } = layout;

  return (
    <g style={{ cursor: onClick ? 'pointer' : undefined }} onClick={() => onClick?.(phase)}>
      {/* Background rectangle */}
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={CORNER_RADIUS}
        ry={CORNER_RADIUS}
        fill={theme.fillMuted}
        stroke={isHighlighted ? theme.stroke : 'none'}
        strokeWidth={isHighlighted ? 1.5 : 0}
      />

      {/* Phase label */}
      <text
        x={x + width / 2}
        y={y + LABEL_OFFSET_Y}
        textAnchor="middle"
        fontSize={11}
        fontWeight={500}
        fill={theme.fill}
        opacity={0.8}
      >
        {theme.label}
      </text>
    </g>
  );
}
