import type { MessageResponse, ContentBlock } from '../../../types';
import { getContentBlocks } from '../contentBlocks';
import { fromAgentProgress } from './fromAgentProgress';
import { fromToolUse } from './fromToolUse';
import type { SubagentInfo } from './types';

export function extractSubagents(
  messages: MessageResponse[],
  toolResults: Map<string, ContentBlock>,
): SubagentInfo[] {
  const fromProgress = fromAgentProgress(messages);
  const fromTool = fromToolUse(messages, toolResults);

  // Dedupe by agentId — prefer agent_progress (richer data) over tool_use
  const seen = new Set<string>();
  const result: SubagentInfo[] = [];

  for (const info of fromProgress) {
    seen.add(info.agentId);
    result.push(info);
  }

  for (const info of fromTool) {
    if (!seen.has(info.agentId)) {
      seen.add(info.agentId);
      result.push(info);
    }
  }

  return result;
}

/** Lightweight check — does the session contain any subagents? */
export function hasSubagents(messages: MessageResponse[]): boolean {
  for (const msg of messages) {
    if (msg.type === 'progress' && msg.data?.type === 'agent_progress' && msg.data?.agentId) {
      return true;
    }
    for (const block of getContentBlocks(msg)) {
      if (block.type === 'tool_use' && block.name === 'Agent') {
        return true;
      }
    }
  }
  return false;
}

export type { SubagentInfo, SubagentFromProgress, SubagentFromToolUse } from './types';
