import type {
  TimelineCycle,
  TimelinePhase,
  LayoutConfig,
  LayoutResult,
  NodeLayout,
  PhaseRegionLayout,
} from './types';

const SIZE_RADIUS: Record<string, number> = {
  S: 8,
  M: 12,
  L: 18,
  XL: 24,
};

const SUBAGENT_Y_OFFSET = 40;

export function computeLayout({
  cycles,
  phases,
  slotWidth = 80,
  viewportHeight = 200,
  padding = 40,
}: {
  cycles: TimelineCycle[];
  phases: TimelinePhase[];
  slotWidth?: number;
  viewportHeight?: number;
  padding?: number;
}): LayoutResult {
  const mainPathY = viewportHeight / 2;

  const nodes: NodeLayout[] = cycles.map((cycle, i) => ({
    cycleIndex: i,
    x: padding + i * slotWidth + slotWidth / 2,
    y: cycle.badges.hasSubagents ? mainPathY + SUBAGENT_Y_OFFSET : mainPathY,
    radius: SIZE_RADIUS[cycle.size] ?? SIZE_RADIUS.M,
  }));

  const phaseRegions: PhaseRegionLayout[] = phases.map((phase, i) => ({
    phaseIndex: i,
    x: padding + phase.startCycleIndex * slotWidth,
    y: 0,
    width: phase.cycleCount * slotWidth,
    height: viewportHeight,
  }));

  const totalWidth = padding * 2 + cycles.length * slotWidth;

  const config: LayoutConfig = {
    slotWidth,
    mainPathY,
    viewportHeight,
    padding,
  };

  return { nodes, phaseRegions, totalWidth, config };
}
