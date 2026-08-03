import type { ContentBlock } from './types';

// --- ContentBlock type guards ---

export function isTextBlock(
  block: ContentBlock,
): block is ContentBlock & { type: 'text'; text: string } {
  return block.type === 'text' && typeof block.text === 'string';
}

export function isThinkingBlock(
  block: ContentBlock,
): block is ContentBlock & { type: 'thinking'; thinking: string } {
  return block.type === 'thinking' && typeof block.thinking === 'string';
}

export function isToolUseBlock(
  block: ContentBlock,
): block is ContentBlock & { type: 'tool_use'; id: string; name: string } {
  return (
    block.type === 'tool_use' && typeof block.id === 'string' && typeof block.name === 'string'
  );
}

export function isToolResultBlock(
  block: ContentBlock,
): block is ContentBlock & { type: 'tool_result'; tool_use_id: string } {
  return block.type === 'tool_result' && typeof block.tool_use_id === 'string';
}
