import { useState } from "react";

interface ThinkingBlockProps {
  thinking: string;
}

export function ThinkingBlock({ thinking }: ThinkingBlockProps) {
  const [expanded, setExpanded] = useState(false);

  const preview = thinking.slice(0, 120).replace(/\n/g, " ");

  return (
    <div className="my-2 rounded border border-gray-200 bg-gray-50">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-gray-500 hover:bg-gray-100"
      >
        <span className={`transition-transform ${expanded ? "rotate-90" : ""}`}>
          ▶
        </span>
        <span className="font-medium italic">Thinking</span>
        {!expanded && (
          <span className="truncate text-gray-400">{preview}…</span>
        )}
      </button>
      {expanded && (
        <pre className="max-h-96 overflow-auto whitespace-pre-wrap border-t border-gray-200 px-3 py-2 text-xs text-gray-600">
          {thinking}
        </pre>
      )}
    </div>
  );
}
