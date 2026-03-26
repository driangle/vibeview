import { useState } from 'react';
import type { ContentBlock, ContentBlockInput } from '../types';
import { EditDiffBlock } from './EditDiffBlock';
import { RawJsonModal } from './RawJsonModal';

interface ToolCallBlockProps {
  block: ContentBlock;
  result?: ContentBlock;
}

function formatInput(input: ContentBlockInput): string {
  if (input.command) return String(input.command);
  if (input.file_path) return String(input.file_path);
  if (input.pattern) return String(input.pattern);
  if (input.query) return String(input.query);
  return JSON.stringify(input, null, 2);
}

function formatResult(content: unknown): string {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((c) => (typeof c === 'object' && c && 'text' in c ? c.text : JSON.stringify(c)))
      .join('\n');
  }
  return JSON.stringify(content, null, 2);
}

export function ToolCallBlock({ block, result }: ToolCallBlockProps) {
  const [expanded, setExpanded] = useState(false);
  const [showRawJson, setShowRawJson] = useState(false);

  if (block.name === 'Edit') {
    return <EditDiffBlock block={block} result={result} />;
  }

  const toolName = block.name || 'Tool';
  const input = block.input || {};
  const summary = formatInput(input);
  const isError = result?.is_error;
  const statusText = result ? (isError ? 'Error' : 'Success') : 'Pending';

  return (
    <div className="ml-12 border border-border bg-surface-dim rounded overflow-hidden shadow-sm">
      {/* Terminal header bar */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full bg-muted px-3 py-1.5 flex items-center justify-between border-b border-border hover:bg-secondary transition-colors"
      >
        <span className="font-headline text-[10px] text-muted-fg flex items-center gap-2">
          <span className="material-symbols-outlined text-xs">terminal</span>
          {toolName.toUpperCase()}
        </span>
        <span
          className={`text-[10px] font-headline uppercase ${
            isError ? 'text-destructive' : result ? 'text-success' : 'text-muted-fg'
          }`}
        >
          Status: {statusText}
        </span>
      </button>

      {/* Terminal body */}
      <div className="p-4 bg-fg/5 font-mono text-xs text-muted-fg space-y-1">
        <div className="text-primary font-bold">&gt; {summary.split('\n')[0].slice(0, 120)}</div>
        {result && (
          <>
            {isError && (
              <div className="text-destructive font-medium">
                ! {formatResult(result.content).split('\n')[0].slice(0, 200)}
              </div>
            )}
            {!isError && !expanded && (
              <div className="text-muted-fg truncate">
                {formatResult(result.content).split('\n')[0].slice(0, 200)}
              </div>
            )}
          </>
        )}
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-border">
          <div className="px-4 py-3">
            <div className="mb-1 text-xs font-headline font-bold text-muted-fg uppercase">
              Input
            </div>
            <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded bg-card p-2 text-xs text-fg">
              {summary}
            </pre>
          </div>
          {result && (
            <div className="border-t border-border px-4 py-3">
              <div className="mb-1 text-xs font-headline font-bold text-muted-fg uppercase">
                Result {isError && <span className="text-destructive">(error)</span>}
              </div>
              <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded bg-card p-2 text-xs text-fg">
                {formatResult(result.content)}
              </pre>
            </div>
          )}
          <div className="border-t border-border px-4 py-2">
            <button
              onClick={() => setShowRawJson(true)}
              className="rounded bg-muted px-2 py-1 text-xs text-muted-fg transition-colors hover:bg-secondary"
            >
              View raw JSON
            </button>
          </div>
        </div>
      )}

      {/* Expand toggle hint */}
      {!expanded && (
        <button
          onClick={() => setExpanded(true)}
          className="w-full px-4 py-1.5 text-[10px] font-headline text-muted-fg hover:text-fg hover:bg-muted/50 transition-colors text-center uppercase tracking-wider"
        >
          Show details
        </button>
      )}

      {showRawJson && (
        <RawJsonModal
          data={result ? { tool_use: block, tool_result: result } : block}
          onClose={() => setShowRawJson(false)}
        />
      )}
    </div>
  );
}
