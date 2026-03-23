import type { MessageResponse } from '../../types';

export type Phase =
  | 'debugging'
  | 'testing'
  | 'devops'
  | 'configuration'
  | 'coding'
  | 'research'
  | 'planning'
  | 'conversation';

export type CycleSize = 'S' | 'M' | 'L' | 'XL';

export interface CycleBadges {
  hasErrors: boolean;
  deepThinking: boolean;
  hasSubagents: boolean;
  approvalGate: boolean;
}

export interface CycleFeatures {
  toolNames: Set<string>;
  hasErrors: boolean;
  fileExtensions: Set<string>;
  filePaths: Set<string>;
  bashCommands: string[];
  thinkingTokens: number;
  textTokens: number;
  hasSubagents: boolean;
}

export interface TimelineCycle {
  index: number;
  phase: Phase;
  size: CycleSize;
  badges: CycleBadges;
  features: CycleFeatures;
  userMessage: MessageResponse | null;
  assistantMessages: MessageResponse[];
  auxiliaryMessages: MessageResponse[];
  promptPreview: string;
  filesTouched: string[];
  costUSD: number;
  totalTokens: number;
  durationMs: number;
  startTime: string;
  endTime: string;
}

export interface TimelinePhase {
  phase: Phase;
  startCycleIndex: number;
  endCycleIndex: number;
  cycleCount: number;
}

export interface NodeLayout {
  cycleIndex: number;
  x: number;
  y: number;
  radius: number;
}

export interface PhaseRegionLayout {
  phaseIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface LayoutConfig {
  slotWidth: number;
  mainPathY: number;
  viewportHeight: number;
  padding: number;
}

export interface LayoutResult {
  nodes: NodeLayout[];
  phaseRegions: PhaseRegionLayout[];
  totalWidth: number;
  config: LayoutConfig;
}

export interface TimelineData {
  cycles: TimelineCycle[];
  phases: TimelinePhase[];
  layout: LayoutResult;
}
