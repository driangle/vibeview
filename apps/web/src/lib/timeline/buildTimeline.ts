import type { MessageResponse } from '../../types';
import type { TimelineData, TimelineCycle, TimelinePhase, LayoutConfig } from './types';
import { classifyPhase } from './classifyPhase';
import { computeLayout } from './layoutEngine';
import {
  extractFeatures,
  computeTotalTokens,
  computeSize,
  computeBadges,
  extractPromptPreview,
  computeCost,
  computeDuration,
} from './cycleMetrics';

/** True if this is a genuine user prompt (not just tool result forwarding). */
function isUserPrompt(msg: MessageResponse): boolean {
  if (msg.type !== 'user') return false;
  const content = msg.message?.content;
  if (!content || typeof content === 'string') return true;
  if (!Array.isArray(content)) return true;
  return content.some((block) => block.type !== 'tool_result');
}

interface RawCycle {
  userMessage: MessageResponse | null;
  assistantMessages: MessageResponse[];
  auxiliaryMessages: MessageResponse[];
}

function groupIntoCycles(messages: MessageResponse[]): RawCycle[] {
  const cycles: RawCycle[] = [];
  let current: RawCycle | null = null;

  for (const msg of messages) {
    if (isUserPrompt(msg)) {
      // Finalize current cycle and start a new one
      if (current) cycles.push(current);
      current = {
        userMessage: msg,
        assistantMessages: [],
        auxiliaryMessages: [],
      };
    } else if (msg.type === 'assistant') {
      if (!current) {
        // Session starts with assistant message (no user prompt yet)
        current = {
          userMessage: null,
          assistantMessages: [msg],
          auxiliaryMessages: [],
        };
      } else {
        // Accumulate all assistant messages (tool loops produce multiple)
        current.assistantMessages.push(msg);
      }
    } else {
      // user (tool_result only), progress, system, file-history-snapshot, custom-title
      if (!current) {
        current = {
          userMessage: null,
          assistantMessages: [],
          auxiliaryMessages: [msg],
        };
      } else {
        current.auxiliaryMessages.push(msg);
      }
    }
  }

  if (current) cycles.push(current);
  return cycles;
}

function finalizeCycle(raw: RawCycle, index: number): TimelineCycle {
  const features = extractFeatures(raw.assistantMessages, raw.auxiliaryMessages);
  const phase = classifyPhase(features);
  const totalTokens = computeTotalTokens(raw.assistantMessages);
  const size = computeSize(totalTokens);
  const badges = computeBadges(features, raw.assistantMessages);

  const allMessages = [raw.userMessage, ...raw.assistantMessages, ...raw.auxiliaryMessages].filter(
    (m): m is MessageResponse => m !== null,
  );

  const { durationMs, startTime, endTime } = computeDuration(allMessages);

  return {
    index,
    phase,
    size,
    badges,
    features,
    userMessage: raw.userMessage,
    assistantMessages: raw.assistantMessages,
    auxiliaryMessages: raw.auxiliaryMessages,
    promptPreview: extractPromptPreview(raw.userMessage),
    filesTouched: [...features.filePaths],
    costUSD: computeCost(raw.assistantMessages),
    totalTokens,
    durationMs,
    startTime,
    endTime,
  };
}

function mergeAdjacentPhases(cycles: TimelineCycle[]): TimelinePhase[] {
  if (cycles.length === 0) return [];

  const phases: TimelinePhase[] = [];
  let currentPhase = cycles[0].phase;
  let startIndex = 0;

  for (let i = 1; i < cycles.length; i++) {
    if (cycles[i].phase !== currentPhase) {
      phases.push({
        phase: currentPhase,
        startCycleIndex: startIndex,
        endCycleIndex: i - 1,
        cycleCount: i - startIndex,
      });
      currentPhase = cycles[i].phase;
      startIndex = i;
    }
  }

  // Push final phase
  phases.push({
    phase: currentPhase,
    startCycleIndex: startIndex,
    endCycleIndex: cycles.length - 1,
    cycleCount: cycles.length - startIndex,
  });

  return phases;
}

export function buildTimeline(
  messages: MessageResponse[],
  layoutOptions?: Partial<LayoutConfig>,
): TimelineData {
  const rawCycles = groupIntoCycles(messages);
  const cycles = rawCycles.map((raw, i) => finalizeCycle(raw, i));
  const phases = mergeAdjacentPhases(cycles);
  const layout = computeLayout({ cycles, phases, ...layoutOptions });
  return { cycles, phases, layout };
}
