import type { TimelineCycle, NodeLayout } from '../../lib/timeline/types';
import { getPhaseTheme } from '../../lib/timeline/phaseTheme';
import { PhaseIcon } from './PhaseIcon';

interface TimelineNodeProps {
  cycle: TimelineCycle;
  layout: NodeLayout;
  isSelected?: boolean;
  onHover?: (cycle: TimelineCycle | null, event?: React.PointerEvent<SVGGElement>) => void;
  onClick?: (cycle: TimelineCycle) => void;
}

/** Small badge indicator positioned at the edge of the node. */
function Badge({
  offsetAngle,
  nodeRadius,
  color,
  label,
}: {
  offsetAngle: number;
  nodeRadius: number;
  color: string;
  label: string;
}) {
  const badgeRadius = 4;
  const dist = nodeRadius + badgeRadius - 1;
  const rad = (offsetAngle * Math.PI) / 180;
  const cx = Math.cos(rad) * dist;
  const cy = Math.sin(rad) * dist;

  return (
    <circle cx={cx} cy={cy} r={badgeRadius} fill={color} stroke="white" strokeWidth="1">
      <title>{label}</title>
    </circle>
  );
}

export function TimelineNode({ cycle, layout, isSelected, onHover, onClick }: TimelineNodeProps) {
  const theme = getPhaseTheme(cycle.phase);
  const { x, y, radius } = layout;

  // Collect active badges
  const badges: { color: string; label: string }[] = [];
  if (cycle.badges.hasErrors) badges.push({ color: '#ef4444', label: 'Error' });
  if (cycle.badges.deepThinking) badges.push({ color: '#8b5cf6', label: 'Deep thinking' });
  if (cycle.badges.hasSubagents) badges.push({ color: '#06b6d4', label: 'Subagent' });
  if (cycle.badges.approvalGate) badges.push({ color: '#eab308', label: 'Approval' });

  // Spread badges evenly around top-right quadrant
  const badgeStartAngle = -120;
  const badgeSpacing = 40;

  return (
    <g
      transform={`translate(${x}, ${y})`}
      style={{ cursor: 'pointer' }}
      onPointerEnter={(e) => onHover?.(cycle, e)}
      onPointerLeave={() => onHover?.(null)}
      onClick={() => onClick?.(cycle)}
    >
      {/* Selection ring */}
      {isSelected && (
        <circle r={radius + 4} fill="none" stroke={theme.fill} strokeWidth="2" opacity={0.5} />
      )}

      {/* Main circle */}
      <circle r={radius} fill={theme.fill} stroke={theme.stroke} strokeWidth="1.5" />

      {/* Phase icon */}
      <PhaseIcon phase={cycle.phase} radius={radius} />

      {/* Badges */}
      {badges.map((badge, i) => (
        <Badge
          key={badge.label}
          offsetAngle={badgeStartAngle + i * badgeSpacing}
          nodeRadius={radius}
          color={badge.color}
          label={badge.label}
        />
      ))}
    </g>
  );
}
