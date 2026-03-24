import type { MessageResponse } from '../../../types';
import { getContentBlocks } from '../contentBlocks';
import type { SkillEntry } from './types';

const COMMAND_NAME_RE = /<command-name>\/?(.+?)<\/command-name>/;

function addSkill(
  counts: Map<string, { count: number; messageUuid: string }>,
  name: string,
  messageUuid: string,
) {
  const existing = counts.get(name);
  if (existing) {
    existing.count++;
  } else {
    counts.set(name, { count: 1, messageUuid });
  }
}

export function extractSkills(messages: MessageResponse[]): SkillEntry[] {
  const counts = new Map<string, { count: number; messageUuid: string }>();

  for (const msg of messages) {
    // Skill tool_use blocks (assistant invokes Skill tool)
    for (const block of getContentBlocks(msg)) {
      if (block.type === 'tool_use' && block.name === 'Skill' && block.input) {
        const skill = String(block.input.skill || '');
        if (skill) addSkill(counts, skill, msg.uuid);
      }
    }

    // Slash command messages (user invokes /skill-name)
    if (msg.type === 'user' && msg.message) {
      const content = msg.message.content;
      const text =
        typeof content === 'string'
          ? content
          : Array.isArray(content)
            ? content
                .filter((b) => b.type === 'text' && b.text)
                .map((b) => b.text)
                .join('\n')
            : '';
      const match = text.match(COMMAND_NAME_RE);
      if (match) addSkill(counts, match[1], msg.uuid);
    }
  }

  return Array.from(counts.entries())
    .map(([name, { count, messageUuid }]) => ({ name, count, messageUuid }))
    .sort((a, b) => b.count - a.count);
}
