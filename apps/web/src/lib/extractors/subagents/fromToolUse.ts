import type { MessageResponse, ContentBlock } from '../../../types';
import { getContentBlocks, resolveResultText } from '../contentBlocks';
import type { SubagentFromToolUse } from './types';

const AGENT_ID_PATTERN = /agentId:\s*([a-f0-9]+)/;

/** Extract subagent info from new-format Agent tool_use blocks. */
export function fromToolUse(
  messages: MessageResponse[],
  toolResults: Map<string, ContentBlock>,
): SubagentFromToolUse[] {
  const subagents: SubagentFromToolUse[] = [];

  for (const msg of messages) {
    for (const block of getContentBlocks(msg)) {
      if (block.type !== 'tool_use' || block.name !== 'Agent' || !block.id) continue;

      const input = block.input ?? {};
      const prompt = String(input.prompt ?? '');
      const description = String(input.description ?? '');

      const result = toolResults.get(block.id);
      const resultText = resolveResultText(result);

      let agentId = '';
      if (resultText) {
        const match = resultText.match(AGENT_ID_PATTERN);
        if (match) agentId = match[1];
      }

      // Fall back to tool_use id if no agentId found in result
      if (!agentId) agentId = `tool_use_${block.id}`;

      subagents.push({
        source: 'tool_use' as const,
        agentId,
        prompt,
        description,
        firstMessageUuid: msg.uuid,
        toolUseId: block.id,
        resultText,
      });
    }
  }

  return subagents;
}
