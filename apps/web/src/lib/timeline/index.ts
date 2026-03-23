export { buildTimeline } from './buildTimeline';
export {
  classifyPhase,
  addPhaseRule,
  setPhaseRules,
  resetPhaseRules,
  getPhaseRules,
} from './classifyPhase';
export type { PhaseRule } from './classifyPhase';
export { computeLayout } from './layoutEngine';
export { getPhaseTheme } from './phaseTheme';
export type { PhaseTheme } from './phaseTheme';
export type {
  Phase,
  CycleSize,
  CycleBadges,
  CycleFeatures,
  TimelineCycle,
  TimelinePhase,
  NodeLayout,
  PhaseRegionLayout,
  LayoutConfig,
  LayoutResult,
  TimelineData,
} from './types';
