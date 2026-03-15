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

  return (
    <div className="flex justify-end">
      <div className="max-w-[80%]">
        <div className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white">
          <MessageContent segments={segments} />
        </div>
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
              return <MessageContent key={i} segments={segments} />;
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

function SystemMessage({ message }: { message: MessageResponse }) {
  const label =
    message.type === "progress" ? "Progress" : "System";
  const detail =
    message.data && typeof message.data === "object"
      ? JSON.stringify(message.data)
      : "";

  return (
    <div className="flex justify-center">
      <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-500">
        {label}
        {detail && (
          <span className="ml-1 text-gray-400" title={detail}>
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
    return <SystemMessage message={message} />;
  }

  return null;
}
