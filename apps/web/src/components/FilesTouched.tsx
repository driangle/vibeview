import { useState, useMemo, useCallback } from 'react';
import type { FileOperation } from './FileViewer';
import { SidebarSection, LocateButton } from './SessionInsights';
import type { ContentBlock, MessageResponse } from '../types';
import { extractFiles, resolveFileOperations } from '../lib/extractors';

interface FilesTouchedProps {
  messages: MessageResponse[];
  toolResults: Map<string, ContentBlock>;
  onFileClick: (filePath: string, operations: FileOperation[]) => void;
  onNavigateToMessage: (uuid: string) => void;
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
  const { categories, entries } = useMemo(() => extractFiles(messages), [messages]);

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

  const totalCount = categories.written.length + categories.read.length;
  if (totalCount === 0) return null;

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
