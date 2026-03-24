import { useState, useMemo, useCallback } from 'react';
import type { FileOperation } from './FileViewer';
import { SidebarSection, LocateButton } from './SessionInsights';
import type { ContentBlock, MessageResponse } from '../types';

interface FilesTouchedProps {
  messages: MessageResponse[];
  toolResults: Map<string, ContentBlock>;
  onFileClick: (filePath: string, operations: FileOperation[]) => void;
  onNavigateToMessage: (uuid: string) => void;
}

interface FilesByCategory {
  written: string[];
  read: string[];
}

interface FileContentEntry {
  toolUseId: string;
  toolName: string;
  filePath: string;
  input: Record<string, unknown>;
  timestamp: string;
  messageUuid: string;
}

const WRITE_TOOLS = new Set(['Edit', 'Write']);
const READ_TOOLS = new Set(['Read']);

function extractFilePaths(messages: MessageResponse[]): {
  categories: FilesByCategory;
  entries: FileContentEntry[];
} {
  const written = new Set<string>();
  const read = new Set<string>();
  const entries: FileContentEntry[] = [];

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

/** Strip `cat -n` line number prefixes like "     1→" from each line. */
function stripLineNumbers(text: string): string {
  return text.replace(/^ *\d+→/gm, '');
}

function extractResultText(result: ContentBlock): string | null {
  const c = result.content;
  if (typeof c === 'string') return c;
  if (Array.isArray(c)) {
    const textBlock = (c as Array<{ type: string; text?: string }>).find(
      (b) => b.type === 'text' && b.text,
    );
    if (textBlock?.text) return textBlock.text;
  }
  return null;
}

function resolveFileOperations(
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
        const text = extractResultText(result);
        if (text)
          ops.push({ type: 'read', content: stripLineNumbers(text), timestamp: entry.timestamp });
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

function CopyPathButton({ filePath }: { filePath: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      await navigator.clipboard.writeText(filePath);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    },
    [filePath],
  );

  return (
    <button
      onClick={handleCopy}
      className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-muted-fg hover:text-fg transition-all shrink-0"
      title="Copy path"
    >
      <span className="material-symbols-outlined text-xs">{copied ? 'check' : 'content_copy'}</span>
    </button>
  );
}

function FileGroup({
  label,
  icon,
  files,
  defaultOpen,
  onFileClick,
  fileToUuid,
  onNavigateToMessage,
}: {
  label: string;
  icon: string;
  files: string[];
  defaultOpen: boolean;
  onFileClick: (filePath: string) => void;
  fileToUuid: Map<string, string>;
  onNavigateToMessage: (uuid: string) => void;
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
            const uuid = fileToUuid.get(filePath);
            return (
              <div key={filePath} className="flex items-center gap-1 group">
                <button
                  onClick={() => onFileClick(filePath)}
                  className="flex-1 min-w-0 px-2.5 py-1.5 bg-card border border-border rounded-md flex items-center gap-2 hover:bg-bg transition-colors text-left cursor-pointer"
                >
                  <span className="material-symbols-outlined text-xs text-muted-fg">
                    description
                  </span>
                  <div className="flex flex-col overflow-hidden flex-1 min-w-0">
                    <span className="text-xs font-medium text-fg truncate">{fileName}</span>
                    <span className="text-[10px] text-muted-fg font-mono truncate">{filePath}</span>
                  </div>
                  <CopyPathButton filePath={filePath} />
                </button>
                {uuid && <LocateButton onClick={() => onNavigateToMessage(uuid)} />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function FilesTouched({
  messages,
  toolResults,
  onFileClick,
  onNavigateToMessage,
}: FilesTouchedProps) {
  const { categories, entries } = useMemo(() => extractFilePaths(messages), [messages]);

  const totalCount = categories.written.length + categories.read.length;
  if (totalCount === 0) return null;

  // Map each file path to the first message UUID that touched it
  const fileToUuid = useMemo(() => {
    const map = new Map<string, string>();
    for (const entry of entries) {
      if (!map.has(entry.filePath)) {
        map.set(entry.filePath, entry.messageUuid);
      }
    }
    return map;
  }, [entries]);

  const handleFileClick = useCallback(
    (filePath: string) => {
      const ops = resolveFileOperations(filePath, entries, toolResults);
      onFileClick(filePath, ops);
    },
    [entries, toolResults, onFileClick],
  );

  return (
    <SidebarSection id="files-touched" icon="folder_open" title="Files Touched" count={totalCount}>
      <div className="space-y-3">
        <FileGroup
          label="Written"
          icon="edit_note"
          files={categories.written}
          defaultOpen
          onFileClick={handleFileClick}
          fileToUuid={fileToUuid}
          onNavigateToMessage={onNavigateToMessage}
        />
        <FileGroup
          label="Read"
          icon="visibility"
          files={categories.read}
          defaultOpen={categories.read.length <= 5}
          onFileClick={handleFileClick}
          fileToUuid={fileToUuid}
          onNavigateToMessage={onNavigateToMessage}
        />
      </div>
    </SidebarSection>
  );
}
