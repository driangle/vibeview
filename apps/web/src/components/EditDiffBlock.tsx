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
  same: 'text-gray-700 dark:text-gray-300',
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
    <div className="my-2 rounded border border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/30">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-amber-100 dark:hover:bg-amber-900/50"
      >
        <span className={`transition-transform ${expanded ? 'rotate-90' : ''}`}>▶</span>
        <span className="rounded bg-amber-200 dark:bg-amber-800 px-1.5 py-0.5 font-mono font-medium text-amber-800 dark:text-amber-200">
          Edit
        </span>
        {!expanded && <span className="truncate text-gray-600 dark:text-gray-400">{filePath}</span>}
      </button>
      {expanded && (
        <div className="border-t border-amber-200 dark:border-amber-700">
          <div className="flex items-center gap-2 px-3 py-2">
            <span className="font-mono text-xs font-medium text-gray-700 dark:text-gray-300">
              {filePath}
            </span>
            {replaceAll && (
              <span className="rounded bg-blue-100 dark:bg-blue-900/50 px-1.5 py-0.5 text-[10px] font-medium text-blue-700 dark:text-blue-300">
                replace all
              </span>
            )}
          </div>
          <div className="max-h-96 overflow-auto border-t border-amber-200 dark:border-amber-700">
            <pre className="text-xs leading-5">
              {diffLines.map((line, i) => (
                <div key={i} className={`px-3 ${lineStyles[line.type]}`}>
                  <span className="mr-2 inline-block w-3 select-none opacity-60">
                    {linePrefix[line.type]}
                  </span>
                  {line.text}
                </div>
              ))}
            </pre>
          </div>
          {result && (
            <div className="border-t border-amber-200 dark:border-amber-700 px-3 py-2">
              <span
                className={`text-xs ${isSuccess ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}
              >
                {resultText}
              </span>
            </div>
          )}
          <div className="border-t border-amber-200 dark:border-amber-700 px-3 py-2">
            <button
              onClick={() => setShowRawJson(true)}
              className="rounded bg-gray-100 dark:bg-gray-800 px-2 py-1 text-xs text-gray-600 dark:text-gray-400 transition-colors hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              View raw JSON
            </button>
          </div>
        </div>
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
