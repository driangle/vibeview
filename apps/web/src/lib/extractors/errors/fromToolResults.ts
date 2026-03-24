import type { MessageResponse, ContentBlock } from '../../../types';
import { getContentBlocks, resolveResultText } from '../contentBlocks';
import type { ErrorEntry } from './types';

export function extractErrors(
  messages: MessageResponse[],
  toolResults: Map<string, ContentBlock>,
): ErrorEntry[] {
  const errors: ErrorEntry[] = [];

  for (const msg of messages) {
    for (const block of getContentBlocks(msg)) {
      if (block.type !== 'tool_use' || !block.id || !block.name) continue;

      const result = toolResults.get(block.id);
      if (!result?.is_error) continue;

      const text = resolveResultText(result);
      errors.push({
        toolName: block.name,
        snippet: (text ?? '').slice(0, 200),
        messageUuid: msg.uuid,
      });
    }
  }

  return errors;
}

/** Lightweight check for buildTimeline — scans user tool_result blocks directly. */
export function hasErrorResults(messages: MessageResponse[]): boolean {
  for (const msg of messages) {
    if (msg.type !== 'user') continue;
    for (const block of getContentBlocks(msg)) {
      if (block.type === 'tool_result' && block.is_error) {
        return true;
      }
    }
  }
  return false;
}
