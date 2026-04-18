import type { MessageResponse } from '../../types';
import type { CycleFeatures, CycleBadges, CycleSize } from './types';
import { getContentBlocks } from '../extractors/contentBlocks';
import { extractToolNames } from '../extractors/tools';
import { extractBashCommands } from '../extractors/commands';
import { hasErrorResults } from '../extractors/errors';
import { extractFilePathSet, extractFileExtensions } from '../extractors/files';
import { hasSubagents as checkHasSubagents } from '../extractors/subagents';

export function extractFeatures(
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

export function computeTotalTokens(msgs: MessageResponse[]): number {
  let total = 0;
  for (const msg of msgs) {
    if (msg.message?.usage) {
      total += msg.message.usage.input_tokens + msg.message.usage.output_tokens;
    }
  }
  return total;
}

export function computeSize(totalTokens: number): CycleSize {
  if (totalTokens >= 20_000) return 'XL';
  if (totalTokens >= 5_000) return 'L';
  if (totalTokens >= 1_000) return 'M';
  return 'S';
}

export function computeBadges(
  features: CycleFeatures,
  assistantMsgs: MessageResponse[],
): CycleBadges {
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

export function extractPromptPreview(userMsg: MessageResponse | null): string {
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

export function computeCost(assistantMsgs: MessageResponse[]): number {
  let cost = 0;
  for (const msg of assistantMsgs) {
    if (msg.message?.usage?.costUSD) {
      cost += msg.message.usage.costUSD;
    }
  }
  return cost;
}

export function computeDuration(messages: MessageResponse[]): {
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
