import type { MessageResponse } from '../../../types';
import { getContentBlocks } from '../contentBlocks';
import type { ToolCount } from './types';

export function extractToolCounts(messages: MessageResponse[]): ToolCount[] {
  const counts = new Map<string, number>();

  for (const msg of messages) {
    for (const block of getContentBlocks(msg)) {
      if (block.type === 'tool_use' && block.name) {
        counts.set(block.name, (counts.get(block.name) || 0) + 1);
      }
    }
  }

  return Array.from(counts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

export function extractToolNames(messages: MessageResponse[]): Set<string> {
  const names = new Set<string>();

  for (const msg of messages) {
    for (const block of getContentBlocks(msg)) {
      if (block.type === 'tool_use' && block.name) {
        names.add(block.name);
      }
    }
  }

  return names;
}
