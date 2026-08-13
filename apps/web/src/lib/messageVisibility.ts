import type { MessageResponse } from '../types';

/**
 * File-history bookkeeping messages record editor backups, not conversation.
 * They are never rendered and are excluded from pagination.
 */
const HIDDEN_MESSAGE_TYPES: ReadonlySet<MessageResponse['type']> = new Set([
  'file-history-snapshot',
  'file-history-delta',
]);

export function isHiddenMessage(message: MessageResponse): boolean {
  return HIDDEN_MESSAGE_TYPES.has(message.type);
}
