import { useEffect, useState } from 'react';
import { CodeBlock } from './CodeBlock';
import { EditDiffView } from './FileViewerDiff';

export type FileOperation =
  | { type: 'read'; content: string; timestamp: string }
  | { type: 'write'; content: string; timestamp: string }
  | { type: 'edit'; oldString: string; newString: string; timestamp: string };

interface FileViewerProps {
  filePath: string;
  operations: FileOperation[];
  onClose: () => void;
}

const EXT_TO_LANGUAGE: Record<string, string> = {
  ts: 'typescript',
  tsx: 'tsx',
  js: 'javascript',
  jsx: 'jsx',
  json: 'json',
  css: 'css',
  scss: 'scss',
  html: 'html',
  md: 'markdown',
  py: 'python',
  rs: 'rust',
  go: 'go',
  yaml: 'yaml',
  yml: 'yaml',
  toml: 'toml',
  sh: 'bash',
  bash: 'bash',
  zsh: 'bash',
  sql: 'sql',
  xml: 'xml',
  svg: 'xml',
  graphql: 'graphql',
  dockerfile: 'docker',
};

function detectLanguage(filePath: string): string | undefined {
  const fileName = filePath.split('/').pop() || '';
  const lower = fileName.toLowerCase();

  if (lower === 'dockerfile') return 'docker';
  if (lower === 'makefile') return 'makefile';

  const ext = fileName.split('.').pop()?.toLowerCase();
  if (!ext) return undefined;
  return EXT_TO_LANGUAGE[ext];
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

export function FileViewer({ filePath, operations, onClose }: FileViewerProps) {
  const [raw, setRaw] = useState(false);
  const fileName = filePath.split('/').pop() || filePath;
  const language = detectLanguage(filePath);

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
            <button
              onClick={() => setRaw(!raw)}
              className={`text-[11px] font-headline uppercase tracking-wide px-2.5 py-1 rounded-md border transition-colors ${
                raw
                  ? 'bg-primary text-primary-fg border-primary'
                  : 'bg-transparent text-muted-fg border-border hover:bg-muted'
              }`}
            >
              Raw
            </button>
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
                  <div className="px-4 pt-3 pb-1 flex items-center gap-2">
                    <OperationBadge type={op.type} />
                    {op.timestamp && (
                      <span className="text-[10px] text-muted-fg font-mono">
                        {formatTime(op.timestamp)}
                      </span>
                    )}
                  </div>
                  {op.type === 'edit' ? (
                    <EditDiffView oldString={op.oldString} newString={op.newString} />
                  ) : raw ? (
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
