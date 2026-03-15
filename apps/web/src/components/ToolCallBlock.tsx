import { useState } from "react";
import type { ContentBlock } from "../types";

interface ToolCallBlockProps {
  block: ContentBlock;
  result?: ContentBlock;
}

function formatInput(input: Record<string, unknown>): string {
  if (input.command) return String(input.command);
  if (input.file_path) return String(input.file_path);
  if (input.pattern) return String(input.pattern);
  if (input.query) return String(input.query);
  return JSON.stringify(input, null, 2);
}

function formatResult(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((c) => (typeof c === "object" && c && "text" in c ? c.text : JSON.stringify(c)))
      .join("\n");
  }
  return JSON.stringify(content, null, 2);
}

export function ToolCallBlock({ block, result }: ToolCallBlockProps) {
  const [expanded, setExpanded] = useState(false);

  const toolName = block.name || "Tool";
  const input = block.input || {};
  const summary = formatInput(input);
  const previewLine = summary.split("\n")[0].slice(0, 100);

  return (
    <div className="my-2 rounded border border-amber-200 bg-amber-50">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-amber-100"
      >
        <span className={`transition-transform ${expanded ? "rotate-90" : ""}`}>
          ▶
        </span>
        <span className="rounded bg-amber-200 px-1.5 py-0.5 font-mono font-medium text-amber-800">
          {toolName}
        </span>
        {!expanded && (
          <span className="truncate text-gray-600">{previewLine}</span>
        )}
      </button>
      {expanded && (
        <div className="border-t border-amber-200">
          <div className="px-3 py-2">
            <div className="mb-1 text-xs font-medium text-gray-500">Input</div>
            <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded bg-white p-2 text-xs text-gray-800">
              {summary}
            </pre>
          </div>
          {result && (
            <div className="border-t border-amber-200 px-3 py-2">
              <div className="mb-1 text-xs font-medium text-gray-500">
                Result {result.is_error && <span className="text-red-500">(error)</span>}
              </div>
              <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded bg-white p-2 text-xs text-gray-800">
                {formatResult(result.content)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
