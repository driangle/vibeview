import { useCallback, useMemo, useState } from 'react';
import type { SessionInsights } from '../../../types';
import type { FileOperation } from '../../FileViewer';
import { SidebarSection, LocateButton } from '../../SidebarSection';
import { barPct } from '../../timeline-track/format';
import type { InsightsActions } from '../actions';

interface FilesSectionProps {
  files: SessionInsights['files'];
  /** Open the file's operations in the local viewer. */
  onFileClick: (filePath: string, operations: FileOperation[]) => void;
  actions: InsightsActions;
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
  fileToCount,
  maxCount,
  actions,
}: {
  label: string;
  icon: string;
  files: string[];
  defaultOpen: boolean;
  onFileClick: (filePath: string) => void;
  fileToUuid: Map<string, string>;
  fileToCount: Map<string, number>;
  maxCount: number;
  actions: InsightsActions;
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
            const count = fileToCount.get(filePath) ?? 1;
            return (
              <div key={filePath} className="flex items-center gap-1 group">
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => onFileClick(filePath)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') onFileClick(filePath);
                  }}
                  className="flex-1 min-w-0 px-2.5 py-1.5 bg-card border border-border rounded-md flex items-center gap-2 hover:bg-bg transition-colors text-left cursor-pointer"
                >
                  <span className="material-symbols-outlined text-xs text-muted-fg">
                    description
                  </span>
                  <div className="flex flex-col overflow-hidden flex-1 min-w-0">
                    <span className="text-xs font-medium text-fg truncate">{fileName}</span>
                    <span className="text-[10px] text-muted-fg font-mono truncate">{filePath}</span>
                  </div>
                  {count > 1 && (
                    <div className="flex flex-none items-center gap-1.5">
                      <div className="h-[6px] w-8 overflow-hidden rounded-full bg-secondary">
                        <div
                          className="h-full rounded-full bg-primary/55"
                          style={{ width: `${barPct(count, maxCount)}%` }}
                        />
                      </div>
                      <span className="w-6 text-right font-mono text-[10px] text-muted-fg">
                        {count}×
                      </span>
                    </div>
                  )}
                  <CopyPathButton filePath={filePath} />
                </div>
                {uuid && (
                  <LocateButton
                    onClick={() => actions.onEntity({ query: filePath, messageUuid: uuid })}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * The Files section: the session's written/read files, each opening its
 * operations in the viewer, with a per-file touch-count meter (derived from the
 * touch entries) and a tab-aware locate button.
 */
export function FilesSection({ files, onFileClick, actions }: FilesSectionProps) {
  const { categories, entries } = files;

  // First message that touched each file, and how many times it was touched.
  const { fileToUuid, fileToCount, maxCount } = useMemo(() => {
    const uuid = new Map<string, string>();
    const count = new Map<string, number>();
    for (const entry of entries) {
      if (!uuid.has(entry.filePath)) uuid.set(entry.filePath, entry.messageUuid);
      count.set(entry.filePath, (count.get(entry.filePath) ?? 0) + 1);
    }
    return { fileToUuid: uuid, fileToCount: count, maxCount: Math.max(0, ...count.values()) };
  }, [entries]);

  const handleFileClick = useCallback(
    (filePath: string) => {
      const ops = entries
        .filter((entry) => entry.filePath === filePath && entry.operation)
        .map((entry) => entry.operation!);
      onFileClick(filePath, ops);
    },
    [entries, onFileClick],
  );

  const totalCount = categories.written.length + categories.read.length;
  if (totalCount === 0) return null;

  return (
    <SidebarSection id="files-touched" icon="folder_open" title="Files" count={totalCount}>
      <div className="space-y-3">
        <FileGroup
          label="Written"
          icon="edit_note"
          files={categories.written}
          defaultOpen
          onFileClick={handleFileClick}
          fileToUuid={fileToUuid}
          fileToCount={fileToCount}
          maxCount={maxCount}
          actions={actions}
        />
        <FileGroup
          label="Read"
          icon="visibility"
          files={categories.read}
          defaultOpen={categories.read.length <= 5}
          onFileClick={handleFileClick}
          fileToUuid={fileToUuid}
          fileToCount={fileToCount}
          maxCount={maxCount}
          actions={actions}
        />
      </div>
    </SidebarSection>
  );
}
