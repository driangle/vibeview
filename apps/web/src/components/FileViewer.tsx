import { useEffect, useState } from 'react';
import { CodeBlock } from './CodeBlock';
import { EditDiffView } from './FileViewerDiff';
import { detectLanguage } from './fileLanguage';

export type FileOperation =
  | { type: 'read'; content: string; timestamp: string }
  | { type: 'write'; content: string; timestamp: string }
  | { type: 'image'; content: string; timestamp: string }
  | { type: 'edit'; oldString: string; newString: string; timestamp: string };

interface FileViewerProps {
  filePath: string;
  operations: FileOperation[];
  onClose: () => void;
  /** Render as plain text instead of syntax-highlighted — used for large raw files. */
  plain?: boolean;
  /**
   * Show the per-operation badge/timestamp row. On for real tool operations
   * (Files Touched); off for synthetic single-content views like the raw
   * session file or a command's output, where a "Read" badge is meaningless.
   */
  showOperationMeta?: boolean;
  /** Show a header button that copies the viewed content to the clipboard. */
  showCopy?: boolean;
}

function formatTime(timestamp: string): string {
  return new Date(timestamp).toLocaleString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

const OP_LABELS: Record<FileOperation['type'], { label: string; icon: string }> = {
  read: { label: 'Read', icon: 'visibility' },
  write: { label: 'Write', icon: 'edit_document' },
  image: { label: 'Read', icon: 'image' },
  edit: { label: 'Edit', icon: 'edit_note' },
};

function OperationBadge({ type }: { type: FileOperation['type'] }) {
  const { label, icon } = OP_LABELS[type];
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-headline uppercase tracking-wide text-muted-fg bg-muted px-2 py-0.5 rounded">
      <span className="material-symbols-outlined text-xs">{icon}</span>
      {label}
    </span>
  );
}

// Above this many characters, syntax highlighting is skipped: tokenizing very
// large content (e.g. a full session JSONL) can hang or crash the highlighter,
// so we always render it as a plain <pre>.
const MAX_HIGHLIGHT_CHARS = 50_000;

export function FileViewer({
  filePath,
  operations,
  onClose,
  plain = false,
  showOperationMeta = true,
  showCopy = false,
}: FileViewerProps) {
  const [copied, setCopied] = useState(false);
  const fileName = filePath.split('/').pop() || filePath;
  const language = detectLanguage(filePath);

  // Always render as plain text when told to, or when any operation is too large
  // to highlight safely — tokenizing very large content can hang or crash the
  // highlighter.
  const tooLargeToHighlight = operations.some(
    (op) => 'content' in op && op.type !== 'image' && op.content.length > MAX_HIGHLIGHT_CHARS,
  );
  const plainView = plain || tooLargeToHighlight;

  const handleCopy = async () => {
    const text = operations
      .map((op) => ('content' in op ? op.content : ''))
      .filter(Boolean)
      .join('\n');
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-4xl max-h-[80vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-surface-dim">
          <div className="flex flex-col overflow-hidden mr-4">
            <span className="text-sm font-medium text-fg truncate">{fileName}</span>
            <span className="text-[11px] text-muted-fg font-mono truncate">{filePath}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {showCopy && (
              <button
                onClick={handleCopy}
                className="inline-flex items-center gap-1 text-[11px] font-headline px-2.5 py-1 rounded-md border border-border bg-transparent text-muted-fg hover:bg-muted transition-colors"
              >
                <span className="material-symbols-outlined text-xs">
                  {copied ? 'check' : 'content_copy'}
                </span>
                {copied ? 'Copied' : 'Copy File Contents'}
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1 rounded-md text-muted-fg hover:text-fg hover:bg-muted transition-colors"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          {operations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-muted-fg gap-2">
              <span className="material-symbols-outlined text-3xl">visibility_off</span>
              <p className="text-sm">Content not available in session data</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {operations.map((op, i) => (
                <div key={i}>
                  {showOperationMeta && (
                    <div className="px-4 pt-3 pb-1 flex items-center gap-2">
                      <OperationBadge type={op.type} />
                      {op.timestamp && (
                        <span className="text-[10px] text-muted-fg font-mono">
                          {formatTime(op.timestamp)}
                        </span>
                      )}
                    </div>
                  )}
                  {op.type === 'edit' ? (
                    <EditDiffView oldString={op.oldString} newString={op.newString} />
                  ) : op.type === 'image' ? (
                    <div className="p-4 flex justify-center bg-surface-dim">
                      <img
                        src={op.content}
                        alt={fileName}
                        className="max-w-full h-auto rounded-md border border-border"
                      />
                    </div>
                  ) : plainView ? (
                    <pre className="p-4 text-xs font-mono text-fg whitespace-pre overflow-auto">
                      {op.content}
                    </pre>
                  ) : (
                    <CodeBlock language={language}>{op.content}</CodeBlock>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
