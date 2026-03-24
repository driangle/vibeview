import { useState, useMemo } from 'react';
import type { MessageResponse } from '../types';

interface FilesTouchedProps {
  messages: MessageResponse[];
}

interface FilesByCategory {
  written: string[];
  read: string[];
}

const WRITE_TOOLS = new Set(['Edit', 'Write']);
const READ_TOOLS = new Set(['Read']);

function extractFilePaths(messages: MessageResponse[]): FilesByCategory {
  const written = new Set<string>();
  const read = new Set<string>();

  for (const msg of messages) {
    const content = msg.message?.content;
    if (!Array.isArray(content)) continue;

    for (const block of content) {
      if (block.type !== 'tool_use' || !block.name || !block.input) continue;

      const filePath = block.input.file_path as string | undefined;
      if (!filePath) continue;

      if (WRITE_TOOLS.has(block.name)) {
        written.add(filePath);
      } else if (READ_TOOLS.has(block.name)) {
        read.add(filePath);
      }
    }
  }

  return {
    written: Array.from(written).sort(),
    read: Array.from(read).sort(),
  };
}

function FileGroup({
  label,
  icon,
  files,
  defaultOpen,
}: {
  label: string;
  icon: string;
  files: string[];
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  if (files.length === 0) return null;

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between text-left group"
      >
        <span className="flex items-center gap-1.5 text-[11px] font-headline text-muted-fg uppercase tracking-wide">
          <span className="material-symbols-outlined text-xs">{icon}</span>
          {label}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="text-[10px] font-medium text-muted-fg bg-muted px-1.5 py-0.5 rounded">
            {files.length}
          </span>
          <span
            className="material-symbols-outlined text-xs text-muted-fg transition-transform duration-150"
            style={{ transform: open ? 'rotate(0deg)' : 'rotate(-90deg)' }}
          >
            expand_more
          </span>
        </span>
      </button>

      {open && (
        <div className="mt-2 space-y-1">
          {files.map((filePath) => {
            const fileName = filePath.split('/').pop() || filePath;
            return (
              <div
                key={filePath}
                title={filePath}
                className="px-2.5 py-1.5 bg-card border border-border rounded-md flex items-center gap-2 hover:bg-bg transition-colors group"
              >
                <span className="material-symbols-outlined text-xs text-muted-fg">description</span>
                <span className="text-xs font-medium text-fg truncate">{fileName}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function FilesTouched({ messages }: FilesTouchedProps) {
  const { written, read } = useMemo(() => extractFilePaths(messages), [messages]);

  const totalCount = written.length + read.length;
  if (totalCount === 0) return null;

  return (
    <div>
      <h3 className="font-headline text-[11px] font-bold uppercase tracking-widest text-muted-fg mb-4 flex items-center gap-2">
        <span className="material-symbols-outlined text-sm">folder_open</span>
        Files Touched
        <span className="text-[10px] font-medium text-muted-fg bg-muted px-1.5 py-0.5 rounded ml-auto">
          {totalCount}
        </span>
      </h3>
      <div className="space-y-3">
        <FileGroup label="Written" icon="edit_note" files={written} defaultOpen />
        <FileGroup label="Read" icon="visibility" files={read} defaultOpen={read.length <= 5} />
      </div>
    </div>
  );
}
