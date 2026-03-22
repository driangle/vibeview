import type { TimelineCycle, NodeLayout } from '../../lib/timeline/types';
import { getPhaseTheme } from '../../lib/timeline/phaseTheme';

interface TimelineNodeProps {
  cycle: TimelineCycle;
  layout: NodeLayout;
  isSelected?: boolean;
  onHover?: (cycle: TimelineCycle | null) => void;
  onClick?: (cycle: TimelineCycle) => void;
}

/** SVG path data for phase icons — designed for a 12x12 viewBox centered at origin. */
function PhaseIcon({ phase, radius }: { phase: string; radius: number }) {
  // Scale icon to ~60% of node radius
  const s = radius * 0.55;

  // Each icon is a simple SVG path/shape centered at (0, 0)
  switch (phase) {
    case 'coding':
      // Pencil: angled line with tip
      return (
        <g
          transform={`scale(${s / 6})`}
          fill="none"
          stroke="white"
          strokeWidth="1.2"
          strokeLinecap="round"
        >
          <path d="M-4 4 L3-3 L5-1 L-2 6z" />
          <line x1={-4} y1={4} x2={-2} y2={6} />
        </g>
      );
    case 'research':
      // Magnifying glass
      return (
        <g
          transform={`scale(${s / 6})`}
          fill="none"
          stroke="white"
          strokeWidth="1.2"
          strokeLinecap="round"
        >
          <circle cx={-1} cy={-1} r={3.5} />
          <line x1={1.5} y1={1.5} x2={4.5} y2={4.5} />
        </g>
      );
    case 'debugging':
      // Bug: oval body with legs
      return (
        <g
          transform={`scale(${s / 6})`}
          fill="none"
          stroke="white"
          strokeWidth="1.2"
          strokeLinecap="round"
        >
          <ellipse cx={0} cy={0} rx={2.5} ry={3.5} />
          <line x1={-2.5} y1={-1.5} x2={-4.5} y2={-3} />
          <line x1={2.5} y1={-1.5} x2={4.5} y2={-3} />
          <line x1={-2.5} y1={1.5} x2={-4.5} y2={3} />
          <line x1={2.5} y1={1.5} x2={4.5} y2={3} />
        </g>
      );
    case 'testing':
      // Checkmark in circle
      return (
        <g
          transform={`scale(${s / 6})`}
          fill="none"
          stroke="white"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx={0} cy={0} r={4.5} />
          <polyline points="-2,0 -0.5,2 3,-2" />
        </g>
      );
    case 'devops':
      // Git branch: line with fork
      return (
        <g
          transform={`scale(${s / 6})`}
          fill="none"
          stroke="white"
          strokeWidth="1.2"
          strokeLinecap="round"
        >
          <circle cx={0} cy={3} r={1.5} />
          <circle cx={0} cy={-3} r={1.5} />
          <circle cx={3} cy={-1} r={1.5} />
          <line x1={0} y1={1.5} x2={0} y2={-1.5} />
          <path d="M0 0 Q1.5 -0.5 2 -1" />
        </g>
      );
    case 'configuration':
      // Gear/cog
      return (
        <g
          transform={`scale(${s / 6})`}
          fill="none"
          stroke="white"
          strokeWidth="1.2"
          strokeLinecap="round"
        >
          <circle cx={0} cy={0} r={2} />
          <circle cx={0} cy={0} r={4.5} strokeDasharray="2 2.5" />
        </g>
      );
    case 'planning':
      // Lightbulb
      return (
        <g
          transform={`scale(${s / 6})`}
          fill="none"
          stroke="white"
          strokeWidth="1.2"
          strokeLinecap="round"
        >
          <path d="M-2 1.5 Q-3.5-1 0-4 Q3.5-1 2 1.5" />
          <line x1={-1.5} y1={3} x2={1.5} y2={3} />
          <line x1={-2} y1={1.5} x2={2} y2={1.5} />
        </g>
      );
    case 'conversation':
    default:
      // Chat bubble
      return (
        <g
          transform={`scale(${s / 6})`}
          fill="none"
          stroke="white"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M-4-3 h8 a1 1 0 011 1 v4 a1 1 0 01-1 1 h-4 l-3 2 v-2 h-1 a1 1 0 01-1-1 v-4 a1 1 0 011-1z" />
        </g>
      );
  }
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
      onPointerEnter={() => onHover?.(cycle)}
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
