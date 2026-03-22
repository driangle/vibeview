import { useState } from 'react';

interface ThinkingBlockProps {
  thinking?: string;
  isActive?: boolean;
}

export function ThinkingBlock({ thinking, isActive }: ThinkingBlockProps) {
  const [expanded, setExpanded] = useState(false);

  if (!thinking) {
    return (
      <div className="my-2 flex items-center gap-2 rounded border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/30 px-3 py-2">
        {isActive ? (
          <div className="flex gap-1">
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-purple-400 dark:bg-purple-500 [animation-delay:-0.3s]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-purple-400 dark:bg-purple-500 [animation-delay:-0.15s]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-purple-400 dark:bg-purple-500" />
          </div>
        ) : (
          <span className="text-xs text-purple-400 dark:text-purple-500">●</span>
        )}
        <span className="text-xs font-medium italic text-purple-600 dark:text-purple-400">
          {isActive ? 'Thinking…' : 'Thought'}
        </span>
      </div>
    );
  }

  const preview = thinking.slice(0, 120).replace(/\n/g, ' ');

  return (
    <div className="my-2 rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
      >
        <span className={`transition-transform ${expanded ? 'rotate-90' : ''}`}>▶</span>
        <span className="font-medium italic">Thinking</span>
        {!expanded && <span className="truncate text-gray-400 dark:text-gray-500">{preview}…</span>}
      </button>
      {expanded && (
        <pre className="max-h-96 overflow-auto whitespace-pre-wrap border-t border-gray-200 dark:border-gray-700 px-3 py-2 text-xs text-gray-600 dark:text-gray-400">
          {thinking}
        </pre>
      )}
    </div>
  );
}
