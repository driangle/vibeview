import { useState } from 'react';
import type { ContentBlock } from '../types';
import { RawJsonModal } from './RawJsonModal';

interface EditDiffBlockProps {
  block: ContentBlock;
  result?: ContentBlock;
}

interface DiffLine {
  type: 'same' | 'added' | 'removed';
  text: string;
}

function computeDiff(oldStr: string, newStr: string): DiffLine[] {
  const oldLines = oldStr.split('\n');
  const newLines = newStr.split('\n');

  // Simple LCS-based diff
  const m = oldLines.length;
  const n = newLines.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        oldLines[i - 1] === newLines[j - 1]
          ? dp[i - 1][j - 1] + 1
          : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }

  const result: DiffLine[] = [];
  let i = m,
    j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      result.push({ type: 'same', text: oldLines[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.push({ type: 'added', text: newLines[j - 1] });
      j--;
    } else {
      result.push({ type: 'removed', text: oldLines[i - 1] });
      i--;
    }
  }

  return result.reverse();
}

const lineStyles: Record<DiffLine['type'], string> = {
  removed: 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300',
  added: 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300',
  same: 'text-muted-fg',
};

const linePrefix: Record<DiffLine['type'], string> = {
  removed: '-',
  added: '+',
  same: ' ',
};

function formatResultText(content: unknown): string {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((c) => (typeof c === 'object' && c && 'text' in c ? c.text : JSON.stringify(c)))
      .join('\n');
  }
  return JSON.stringify(content, null, 2);
}

export function EditDiffBlock({ block, result }: EditDiffBlockProps) {
  const [expanded, setExpanded] = useState(false);
  const [showRawJson, setShowRawJson] = useState(false);

  const input = block.input || {};
  const filePath = String(input.file_path || '');
  const oldString = String(input.old_string || '');
  const newString = String(input.new_string || '');
  const replaceAll = Boolean(input.replace_all);
  const diffLines = computeDiff(oldString, newString);

  const resultText = result ? formatResultText(result.content) : null;
  const isSuccess = result ? !result.is_error : null;

  return (
    <div className="ml-12 border border-border bg-surface-dim rounded overflow-hidden shadow-sm">
      {/* Terminal header bar */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full bg-muted px-3 py-1.5 flex items-center justify-between border-b border-border hover:bg-secondary transition-colors"
      >
        <span className="font-headline text-[10px] text-muted-fg flex items-center gap-2">
          <span className="material-symbols-outlined text-xs">edit_note</span>
          EDIT
          <span className="text-fg font-mono">{filePath}</span>
          {replaceAll && (
            <span className="rounded bg-info/20 px-1.5 py-0.5 text-[10px] font-medium text-info">
              replace all
            </span>
          )}
        </span>
        <span
          className={`text-[10px] font-headline uppercase ${
            result ? (isSuccess ? 'text-success' : 'text-destructive') : 'text-muted-fg'
          }`}
        >
          Status: {result ? (isSuccess ? 'Success' : 'Error') : 'Pending'}
        </span>
      </button>

      {/* Diff preview (always shown) */}
      <div className="max-h-48 overflow-auto">
        <pre className="text-xs leading-5">
          {diffLines.slice(0, expanded ? undefined : 10).map((line, i) => (
            <div key={i} className={`px-3 ${lineStyles[line.type]}`}>
              <span className="mr-2 inline-block w-3 select-none opacity-60">
                {linePrefix[line.type]}
              </span>
              {line.text}
            </div>
          ))}
        </pre>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-border">
          {diffLines.length > 10 && (
            <div className="max-h-48 overflow-auto">
              <pre className="text-xs leading-5">
                {diffLines.slice(10).map((line, i) => (
                  <div key={i + 10} className={`px-3 ${lineStyles[line.type]}`}>
                    <span className="mr-2 inline-block w-3 select-none opacity-60">
                      {linePrefix[line.type]}
                    </span>
                    {line.text}
                  </div>
                ))}
              </pre>
            </div>
          )}
          {result && resultText && (
            <div className="border-t border-border px-3 py-2">
              <span className={`text-xs ${isSuccess ? 'text-success' : 'text-destructive'}`}>
                {resultText}
              </span>
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

      {/* Expand toggle */}
      {!expanded && (
        <button
          onClick={() => setExpanded(true)}
          className="w-full px-4 py-1.5 text-[10px] font-headline text-muted-fg hover:text-fg hover:bg-muted/50 transition-colors text-center uppercase tracking-wider border-t border-border"
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
