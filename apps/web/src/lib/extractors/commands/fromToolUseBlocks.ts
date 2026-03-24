import type { MessageResponse } from '../../../types';
import { getContentBlocks } from '../contentBlocks';
import type { BashCommandEntry } from './types';

export function extractBashCommands(messages: MessageResponse[]): BashCommandEntry[] {
  const commands: BashCommandEntry[] = [];

  for (const msg of messages) {
    for (const block of getContentBlocks(msg)) {
      if (block.type === 'tool_use' && block.name === 'Bash' && block.input && block.id) {
        const cmd = block.input.command;
        if (typeof cmd === 'string') {
          commands.push({ command: cmd, toolUseId: block.id, messageUuid: msg.uuid });
        }
      }
    }
  }

  return commands;
}
