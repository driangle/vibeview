import type { MessageResponse } from '../../../types';
import type { SubagentFromProgress } from './types';

/** Extract subagent info from old-format agent_progress messages. */
export function fromAgentProgress(messages: MessageResponse[]): SubagentFromProgress[] {
  const groups = new Map<string, MessageResponse[]>();
  const firstUuids = new Map<string, string>();
  const prompts = new Map<string, string>();

  for (const msg of messages) {
    if (msg.type !== 'progress' || msg.data?.type !== 'agent_progress') continue;
    const agentId = String(msg.data.agentId ?? '');
    if (!agentId) continue;

    const existing = groups.get(agentId);
    if (existing) {
      existing.push(msg);
    } else {
      groups.set(agentId, [msg]);
      firstUuids.set(agentId, msg.uuid);
      prompts.set(agentId, String(msg.data.prompt ?? ''));
    }
  }

  return Array.from(groups.entries()).map(([agentId, turns]) => ({
    source: 'agent_progress' as const,
    agentId,
    prompt: prompts.get(agentId) ?? '',
    description: '',
    firstMessageUuid: firstUuids.get(agentId) ?? turns[0].uuid,
    turns,
  }));
}
