import type { ContentBlock, MessageResponse, PaginatedSessions, SessionDetail } from './types';

// --- API response validation ---

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

export function isMessageResponse(v: unknown): v is MessageResponse {
  if (!isObject(v)) return false;
  return (
    typeof v.uuid === 'string' && typeof v.type === 'string' && typeof v.timestamp === 'string'
  );
}

export function isPaginatedSessions(v: unknown): v is PaginatedSessions {
  if (!isObject(v)) return false;
  return Array.isArray(v.sessions) && typeof v.total === 'number';
}

export function isSessionDetail(v: unknown): v is SessionDetail {
  if (!isObject(v)) return false;
  return typeof v.id === 'string' && typeof v.filePath === 'string' && Array.isArray(v.messages);
}

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
