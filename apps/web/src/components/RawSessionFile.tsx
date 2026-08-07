import { useCallback } from 'react';
import { SidebarSection } from './SessionInsights';
import { fetcher } from '../api';
import type { FileOperation } from './FileViewer';

export interface RawFileView {
  path: string;
  operations: FileOperation[];
  plain?: boolean;
  showOperationMeta?: boolean;
  showCopy?: boolean;
}

interface RawSessionFileProps {
  filePath: string;
  sessionId: string;
  onOpen: (view: RawFileView) => void;
}

/**
 * Sidebar entry for the session's own JSONL file. Clicking it fetches the raw
 * (redacted, size-capped) content from the server and opens it in the viewer.
 */
export function RawSessionFile({ filePath, sessionId, onOpen }: RawSessionFileProps) {
  const handleClick = useCallback(async () => {
    try {
      const { content, truncated } = await fetcher<{ content: string; truncated: boolean }>(
        `/api/sessions/${sessionId}/raw`,
      );
      const body = truncated ? `${content}\n\n… (truncated — file exceeds preview limit)` : content;
      onOpen({
        path: filePath,
        operations: [{ type: 'read', content: body, timestamp: '' }],
        plain: true,
        showOperationMeta: false,
        showCopy: true,
      });
    } catch {
      onOpen({ path: filePath, operations: [] });
    }
  }, [filePath, sessionId, onOpen]);

  const handleCopyPath = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      await navigator.clipboard.writeText(filePath);
    },
    [filePath],
  );

  return (
    <SidebarSection id="raw-session-file" icon="attach_file" title="Raw Session File">
      <button
        onClick={handleClick}
        className="w-full p-3 bg-card border border-border rounded-lg flex items-center gap-3 hover:bg-bg transition-colors cursor-pointer group text-left"
      >
        <span className="material-symbols-outlined text-primary group-hover:scale-110 transition-transform">
          description
        </span>
        <div className="flex flex-col overflow-hidden flex-1 min-w-0">
          <span className="text-xs font-medium text-fg truncate">{filePath.split('/').pop()}</span>
          <span className="text-[10px] text-muted-fg font-mono truncate">{filePath}</span>
        </div>
        <span
          role="button"
          tabIndex={0}
          onClick={handleCopyPath}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              e.stopPropagation();
              navigator.clipboard.writeText(filePath);
            }
          }}
          className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-muted-fg hover:text-fg transition-all shrink-0"
          title="Copy path"
        >
          <span className="material-symbols-outlined text-xs">content_copy</span>
        </span>
      </button>
    </SidebarSection>
  );
}
