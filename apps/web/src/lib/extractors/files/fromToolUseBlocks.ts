import type { MessageResponse } from '../../../types';
import { getContentBlocks } from '../contentBlocks';
import type { FileContentEntry, FilesResult } from './types';

const WRITE_TOOLS = new Set(['Edit', 'Write']);
const READ_TOOLS = new Set(['Read']);

export function extractFiles(messages: MessageResponse[]): FilesResult {
  const written = new Set<string>();
  const read = new Set<string>();
  const entries: FileContentEntry[] = [];

  for (const msg of messages) {
    for (const block of getContentBlocks(msg)) {
      if (block.type !== 'tool_use' || !block.name || !block.input) continue;

      const filePath = block.input.file_path;
      if (typeof filePath !== 'string') continue;

      if (WRITE_TOOLS.has(block.name)) {
        written.add(filePath);
      } else if (READ_TOOLS.has(block.name)) {
        read.add(filePath);
      }

      if (block.id) {
        entries.push({
          toolUseId: block.id,
          toolName: block.name,
          filePath,
          input: block.input,
          timestamp: msg.timestamp,
          messageUuid: msg.uuid,
        });
      }
    }
  }

  return {
    categories: {
      written: Array.from(written).sort(),
      read: Array.from(read).sort(),
    },
    entries,
  };
}

export function extractFilePathSet(messages: MessageResponse[]): Set<string> {
  const paths = new Set<string>();

  for (const msg of messages) {
    for (const block of getContentBlocks(msg)) {
      if (block.type === 'tool_use' && block.input) {
        const fp = block.input.file_path;
        if (typeof fp === 'string') {
          paths.add(fp);
        }
      }
    }
  }

  return paths;
}

function extractFileExtension(filePath: string): string {
  const lastDot = filePath.lastIndexOf('.');
  if (lastDot === -1) return '';
  return filePath.slice(lastDot).toLowerCase();
}

export function extractFileExtensions(messages: MessageResponse[]): Set<string> {
  const extensions = new Set<string>();

  for (const fp of extractFilePathSet(messages)) {
    const ext = extractFileExtension(fp);
    if (ext) extensions.add(ext);
  }

  return extensions;
}
