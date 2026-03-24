import type { ContentBlock } from '../../../types';
import type { FileOperation } from '../../../components/FileViewer';
import { resolveResultText } from '../contentBlocks';
import type { FileContentEntry } from './types';

/** Strip `cat -n` line number prefixes like "     1→" from each line. */
function stripLineNumbers(text: string): string {
  return text.replace(/^ *\d+→/gm, '');
}

export function resolveFileOperations(
  filePath: string,
  entries: FileContentEntry[],
  toolResults: Map<string, ContentBlock>,
): FileOperation[] {
  const ops: FileOperation[] = [];

  for (const entry of entries) {
    if (entry.filePath !== filePath) continue;

    if (entry.toolName === 'Write') {
      const content = entry.input.content;
      if (typeof content === 'string') {
        ops.push({ type: 'write', content, timestamp: entry.timestamp });
      }
    } else if (entry.toolName === 'Read') {
      const result = toolResults.get(entry.toolUseId);
      if (result) {
        const text = resolveResultText(result);
        if (text) {
          ops.push({ type: 'read', content: stripLineNumbers(text), timestamp: entry.timestamp });
        }
      }
    } else if (entry.toolName === 'Edit') {
      const oldString = entry.input.old_string;
      const newString = entry.input.new_string;
      if (typeof oldString === 'string' && typeof newString === 'string') {
        ops.push({ type: 'edit', oldString, newString, timestamp: entry.timestamp });
      }
    }
  }

  return ops;
}
