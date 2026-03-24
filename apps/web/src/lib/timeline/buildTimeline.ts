import type { MessageResponse } from '../../types';
import type {
  TimelineData,
  TimelineCycle,
  TimelinePhase,
  CycleFeatures,
  CycleBadges,
  CycleSize,
  LayoutConfig,
} from './types';
import { classifyPhase } from './classifyPhase';
import { computeLayout } from './layoutEngine';
import { getContentBlocks } from '../extractors/contentBlocks';
import { extractToolNames } from '../extractors/tools';
import { extractBashCommands } from '../extractors/commands';
import { hasErrorResults } from '../extractors/errors';
import { extractFilePathSet, extractFileExtensions } from '../extractors/files';
import { hasSubagents as checkHasSubagents } from '../extractors/subagents';

/** True if this is a genuine user prompt (not just tool result forwarding). */
function isUserPrompt(msg: MessageResponse): boolean {
  if (msg.type !== 'user') return false;
  const content = msg.message?.content;
  if (!content || typeof content === 'string') return true;
  if (!Array.isArray(content)) return true;
  return content.some((block) => block.type !== 'tool_result');
}

function extractFeatures(
  assistantMsgs: MessageResponse[],
  auxiliaryMsgs: MessageResponse[],
): CycleFeatures {
  let thinkingTokens = 0;
  let textTokens = 0;

  for (const msg of assistantMsgs) {
    for (const block of getContentBlocks(msg)) {
      if (block.type === 'thinking' && block.thinking) {
        thinkingTokens += block.thinking.length;
      } else if (block.type === 'text' && block.text) {
        textTokens += block.text.length;
      }
    }
  }

  const allMsgs = [...assistantMsgs, ...auxiliaryMsgs];

  return {
    toolNames: extractToolNames(assistantMsgs),
    hasErrors: hasErrorResults(auxiliaryMsgs),
    fileExtensions: extractFileExtensions(assistantMsgs),
    filePaths: extractFilePathSet(assistantMsgs),
    bashCommands: extractBashCommands(assistantMsgs).map((e) => e.command),
    thinkingTokens,
    textTokens,
    hasSubagents: checkHasSubagents(allMsgs),
  };
}

function computeTotalTokens(msgs: MessageResponse[]): number {
  let total = 0;
  for (const msg of msgs) {
    if (msg.message?.usage) {
      total += msg.message.usage.input_tokens + msg.message.usage.output_tokens;
    }
  }
  return total;
}

function computeSize(totalTokens: number): CycleSize {
  if (totalTokens >= 20_000) return 'XL';
  if (totalTokens >= 5_000) return 'L';
  if (totalTokens >= 1_000) return 'M';
  return 'S';
}

function computeBadges(features: CycleFeatures, assistantMsgs: MessageResponse[]): CycleBadges {
  // Approval gate: last assistant message's last content block is a tool_use
  let approvalGate = false;
  const lastMsg = assistantMsgs[assistantMsgs.length - 1];
  if (lastMsg) {
    const blocks = getContentBlocks(lastMsg);
    if (blocks.length > 0 && blocks[blocks.length - 1].type === 'tool_use') {
      approvalGate = true;
    }
  }

  return {
    hasErrors: features.hasErrors,
    deepThinking: features.thinkingTokens > 500,
    hasSubagents: features.hasSubagents,
    approvalGate,
  };
}

function extractPromptPreview(userMsg: MessageResponse | null): string {
  if (!userMsg) return '';
  const content = userMsg.message?.content;
  if (typeof content === 'string') return content.slice(0, 100);
  if (!Array.isArray(content)) return userMsg.content?.slice(0, 100) ?? '';
  for (const block of content) {
    if (block.type === 'text' && block.text) {
      return block.text.slice(0, 100);
    }
  }
  return '';
}

function computeCost(assistantMsgs: MessageResponse[]): number {
  let cost = 0;
  for (const msg of assistantMsgs) {
    if (msg.message?.usage?.costUSD) {
      cost += msg.message.usage.costUSD;
    }
  }
  return cost;
}

function computeDuration(messages: MessageResponse[]): {
  durationMs: number;
  startTime: string;
  endTime: string;
} {
  if (messages.length === 0) {
    return { durationMs: 0, startTime: '', endTime: '' };
  }
  const startTime = messages[0].timestamp;
  const endTime = messages[messages.length - 1].timestamp;
  const start = new Date(startTime).getTime();
  const end = new Date(endTime).getTime();
  return {
    durationMs: Math.max(0, end - start),
    startTime,
    endTime,
  };
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
