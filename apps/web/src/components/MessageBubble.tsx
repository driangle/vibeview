import { useState } from 'react';
import type { MessageResponse, ContentBlock } from '../types';
import { ThinkingBlock } from './ThinkingBlock';
import { ToolCallBlock } from './ToolCallBlock';
import { AgentProgressWidget } from './AgentProgressWidget';
import { processMessageContent } from './processMessageContent';
import { MessageContent } from './MessageContent';
import { HookMessage, SystemMessage } from './EventMessages';
import { RawJsonModal } from './RawJsonModal';

function isHookMessage(msg: MessageResponse): boolean {
  return msg.type === 'progress' && msg.data?.type === 'hook_progress';
}

function isAgentProgressMessage(msg: MessageResponse): boolean {
  return msg.type === 'progress' && msg.data?.type === 'agent_progress';
}

interface MessageBubbleProps {
  message: MessageResponse;
  toolResults: Map<string, ContentBlock>;
  agentGroups: Map<string, MessageResponse[]>;
  agentGroupFirstIds: Set<string>;
  isLastMessage?: boolean;
}

function formatTimestamp(ts: string): string {
  return new Date(ts).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function RawJsonButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="rounded p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
      title="View raw JSON"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        className="h-3.5 w-3.5"
      >
        <path
          fillRule="evenodd"
          d="M6.28 5.22a.75.75 0 010 1.06L2.56 10l3.72 3.72a.75.75 0 01-1.06 1.06L.97 10.53a.75.75 0 010-1.06l4.25-4.25a.75.75 0 011.06 0zm7.44 0a.75.75 0 011.06 0l4.25 4.25a.75.75 0 010 1.06l-4.25 4.25a.75.75 0 01-1.06-1.06L17.44 10l-3.72-3.72a.75.75 0 010-1.06zM11.377 2.011a.75.75 0 01.612.867l-2.5 14.5a.75.75 0 01-1.478-.255l2.5-14.5a.75.75 0 01.866-.612z"
          clipRule="evenodd"
        />
      </svg>
    </button>
  );
}

function UserMessage({ message }: { message: MessageResponse }) {
  const [showRaw, setShowRaw] = useState(false);
  const content = message.message?.content;
  let text = '';

  if (typeof content === 'string') {
    text = content;
  } else if (Array.isArray(content)) {
    text = content
      .filter((b) => b.type === 'text')
      .map((b) => b.text || '')
      .join('\n');
  }

  const segments = processMessageContent(text);
  if (segments.length === 0) return null;

  const textSegments = segments.filter((s) => s.type === 'text');
  const specialSegments = segments.filter((s) => s.type !== 'text');

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
        <div className="mt-1 flex items-center justify-end gap-1 text-xs text-gray-400 dark:text-gray-500">
          <RawJsonButton onClick={() => setShowRaw(true)} />
          {formatTimestamp(message.timestamp)}
        </div>
      </div>
      {showRaw && <RawJsonModal data={message.message} onClose={() => setShowRaw(false)} />}
    </div>
  );
}

function AssistantMessage({
  message,
  toolResults,
  isLastMessage,
}: {
  message: MessageResponse;
  toolResults: Map<string, ContentBlock>;
  isLastMessage?: boolean;
}) {
  const [showRaw, setShowRaw] = useState(false);
  const content = message.message?.content;
  if (!Array.isArray(content)) return null;

  // Split content into groups: consecutive non-tool blocks go in a bubble, tool blocks render standalone
  const groups: { type: 'bubble' | 'tool'; blocks: { block: ContentBlock; index: number }[] }[] =
    [];
  for (let i = 0; i < content.length; i++) {
    const block = content[i];
    const isToolUse = block.type === 'tool_use';
    const groupType = isToolUse ? 'tool' : 'bubble';
    const last = groups[groups.length - 1];
    if (last && last.type === groupType) {
      last.blocks.push({ block, index: i });
    } else {
      groups.push({ type: groupType, blocks: [{ block, index: i }] });
    }
  }

  return (
    <div className="flex justify-start">
      <div className="max-w-[80%]">
        {groups.map((group, gi) => {
          if (group.type === 'tool') {
            return group.blocks.map(({ block, index }) => {
              const result = block.id ? toolResults.get(block.id) : undefined;
              return <ToolCallBlock key={index} block={block} result={result} />;
            });
          }
          // Render non-tool blocks inside the message bubble
          const rendered = group.blocks.map(({ block, index }) => {
            if (block.type === 'text' && block.text) {
              const segments = processMessageContent(block.text);
              if (segments.length === 0) return null;
              return <MessageContent key={index} segments={segments} rawMessage={message} />;
            }
            if (block.type === 'thinking') {
              return (
                <ThinkingBlock
                  key={index}
                  thinking={block.thinking}
                  isActive={!block.thinking && isLastMessage}
                />
              );
            }
            return null;
          });
          if (rendered.every((r) => r === null)) return null;
          return (
            <div
              key={gi}
              className="rounded-lg bg-white dark:bg-gray-800 px-4 py-2 text-sm text-gray-900 dark:text-gray-100 shadow-sm ring-1 ring-gray-200 dark:ring-gray-700"
            >
              {rendered}
            </div>
          );
        })}
        <div className="mt-1 flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
          <RawJsonButton onClick={() => setShowRaw(true)} />
          <span>{formatTimestamp(message.timestamp)}</span>
          {message.message?.model && (
            <span className="rounded bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 text-gray-500 dark:text-gray-400">
              {message.message.model}
            </span>
          )}
        </div>
        {showRaw && <RawJsonModal data={message.message} onClose={() => setShowRaw(false)} />}
      </div>
    </div>
  );
}

export function MessageBubble({
  message,
  toolResults,
  agentGroups,
  agentGroupFirstIds,
  isLastMessage,
}: MessageBubbleProps) {
  if (message.type === 'file-history-snapshot') return null;

  if (message.type === 'user' && message.message) {
    // Skip user messages that only contain tool_result blocks (shown inline with tool calls)
    const content = message.message.content;
    if (Array.isArray(content) && content.every((b) => b.type === 'tool_result')) {
      return null;
    }
    return <UserMessage message={message} />;
  }

  if (message.type === 'assistant' && message.message) {
    return (
      <AssistantMessage message={message} toolResults={toolResults} isLastMessage={isLastMessage} />
    );
  }

  if (isAgentProgressMessage(message)) {
    // Only render the widget on the first message of each agent group.
    if (!agentGroupFirstIds.has(message.uuid)) return null;
    const agentId = String(message.data?.agentId ?? '');
    const group = agentGroups.get(agentId);
    if (!group || group.length === 0) return null;
    return <AgentProgressWidget messages={group} />;
  }

  if (message.type === 'system' || message.type === 'progress') {
    if (isHookMessage(message)) {
      return <HookMessage message={message} />;
    }
    return <SystemMessage message={message} />;
  }

  return null;
}
