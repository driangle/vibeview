/** SVG path data for phase icons — designed for a 12x12 viewBox centered at origin. */
export function PhaseIcon({ phase, radius }: { phase: string; radius: number }) {
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
