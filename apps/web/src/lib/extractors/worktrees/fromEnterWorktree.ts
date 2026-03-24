import type { MessageResponse, ContentBlock } from '../../../types';
import { getContentBlocks } from '../contentBlocks';
import type { WorktreeEntry } from './types';

export function extractWorktrees(
  messages: MessageResponse[],
  toolResults: Map<string, ContentBlock>,
): WorktreeEntry[] {
  const worktrees: WorktreeEntry[] = [];

  for (const msg of messages) {
    for (const block of getContentBlocks(msg)) {
      if (block.type !== 'tool_use' || block.name !== 'EnterWorktree' || !block.input || !block.id)
        continue;

      const name = String(block.input.name || '');
      const result = toolResults.get(block.id);
      let path = '';
      let branch = '';

      if (result) {
        const text = typeof result.content === 'string' ? result.content : '';
        const pathMatch = text.match(/worktree at ([^\s]+)/);
        const branchMatch = text.match(/on branch ([^\s.]+)/);
        if (pathMatch) path = pathMatch[1];
        if (branchMatch) branch = branchMatch[1];
      }

      worktrees.push({ name, path, branch, messageUuid: msg.uuid });
    }
  }

  return worktrees;
}
