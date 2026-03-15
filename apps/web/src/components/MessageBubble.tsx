import { useState } from "react";
import type { MessageResponse, ContentBlock } from "../types";
import { ThinkingBlock } from "./ThinkingBlock";
import { ToolCallBlock } from "./ToolCallBlock";
import { processMessageContent } from "./processMessageContent";
import { MessageContent } from "./MessageContent";

interface MessageBubbleProps {
  message: MessageResponse;
  toolResults: Map<string, ContentBlock>;
}

function formatTimestamp(ts: string): string {
  return new Date(ts).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function UserMessage({ message }: { message: MessageResponse }) {
  const content = message.message?.content;
  let text = "";

  if (typeof content === "string") {
    text = content;
  } else if (Array.isArray(content)) {
    text = content
      .filter((b) => b.type === "text")
      .map((b) => b.text || "")
      .join("\n");
  }

  const segments = processMessageContent(text);
  if (segments.length === 0) return null;

  const textSegments = segments.filter((s) => s.type === "text");
  const specialSegments = segments.filter((s) => s.type !== "text");

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="max-w-[80%]">
        {textSegments.length > 0 && (
          <div className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white">
            <MessageContent segments={textSegments} rawMessage={message} />
          </div>
        )}
        {specialSegments.length > 0 && (
          <div className="text-sm">
            <MessageContent segments={specialSegments} rawMessage={message} />
          </div>
        )}
        <div className="mt-1 text-right text-xs text-gray-400">
          {formatTimestamp(message.timestamp)}
        </div>
      </div>
    </div>
  );
}

function AssistantMessage({
  message,
  toolResults,
}: {
  message: MessageResponse;
  toolResults: Map<string, ContentBlock>;
}) {
  const content = message.message?.content;
  if (!Array.isArray(content)) return null;

  return (
    <div className="flex justify-start">
      <div className="max-w-[80%]">
        <div className="rounded-lg bg-white px-4 py-2 text-sm text-gray-900 shadow-sm ring-1 ring-gray-200">
          {content.map((block, i) => {
            if (block.type === "text" && block.text) {
              const segments = processMessageContent(block.text);
              if (segments.length === 0) return null;
              return <MessageContent key={i} segments={segments} rawMessage={message} />;
            }
            if (block.type === "thinking" && block.thinking) {
              return <ThinkingBlock key={i} thinking={block.thinking} />;
            }
            if (block.type === "tool_use") {
              const result = block.id ? toolResults.get(block.id) : undefined;
              return <ToolCallBlock key={i} block={block} result={result} />;
            }
            return null;
          })}
        </div>
        <div className="mt-1 flex items-center gap-2 text-xs text-gray-400">
          <span>{formatTimestamp(message.timestamp)}</span>
          {message.message?.model && (
            <span className="rounded bg-gray-100 px-1.5 py-0.5 text-gray-500">
              {message.message.model}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function isHookMessage(msg: MessageResponse): boolean {
  return msg.type === "progress" && msg.data?.type === "hook_progress";
}

function JsonModal({
  data,
  onClose,
}: {
  data: Record<string, unknown>;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="max-h-[80vh] w-full max-w-xl overflow-auto rounded-lg bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700">Raw Event</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            &times;
          </button>
        </div>
        <pre className="overflow-auto rounded bg-gray-50 p-4 text-xs text-gray-800">
          {JSON.stringify(data, null, 2)}
        </pre>
      </div>
    </div>
  );
}

function HookMessage({ message }: { message: MessageResponse }) {
  const [showJson, setShowJson] = useState(false);
  const hookName = String(message.data?.hookName ?? "unknown");

  return (
    <>
      <div className="-ml-4 flex items-center gap-2">
        <button
          onClick={() => setShowJson(true)}
          className="flex items-center gap-1.5 border-l-2 border-amber-300 py-0.5 pl-2 text-xs text-amber-600 hover:text-amber-800"
        >
          <span className="font-medium">Hook</span>
          <span className="text-amber-400">{hookName}</span>
        </button>
      </div>
      {showJson && message.data && (
        <JsonModal data={message.data} onClose={() => setShowJson(false)} />
      )}
    </>
  );
}

function SystemMessage({ message }: { message: MessageResponse }) {
  const label =
    message.type === "progress" ? "Progress" : "System";
  const detail =
    message.data && typeof message.data === "object"
      ? JSON.stringify(message.data)
      : "";

  return (
    <div className="-ml-4 flex items-center gap-2">
      <span className="border-l-2 border-gray-200 py-0.5 pl-2 text-xs text-gray-400">
        {label}
        {detail && (
          <span className="ml-1" title={detail}>
            — {detail.slice(0, 80)}
          </span>
        )}
      </span>
    </div>
  );
}

export function MessageBubble({ message, toolResults }: MessageBubbleProps) {
  if (message.type === "file-history-snapshot") return null;

  if (message.type === "user" && message.message) {
    // Skip user messages that only contain tool_result blocks (shown inline with tool calls)
    const content = message.message.content;
    if (Array.isArray(content) && content.every((b) => b.type === "tool_result")) {
      return null;
    }
    return <UserMessage message={message} />;
  }

  if (message.type === "assistant" && message.message) {
    return <AssistantMessage message={message} toolResults={toolResults} />;
  }

  if (message.type === "system" || message.type === "progress") {
    if (isHookMessage(message)) {
      return <HookMessage message={message} />;
    }
    return <SystemMessage message={message} />;
  }

  return null;
}
