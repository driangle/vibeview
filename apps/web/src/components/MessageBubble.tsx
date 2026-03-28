import { useState } from 'react';
import type { MessageResponse, ContentBlock } from '../types';
import { ThinkingBlock } from './ThinkingBlock';
import { ToolCallBlock } from './ToolCallBlock';
import { AgentProgressWidget } from './AgentProgressWidget';
import { processMessageContent } from '../lib/parsers';
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
      className="rounded p-0.5 text-muted-fg hover:text-fg transition-colors"
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

function getMessageText(message: MessageResponse): string {
  const content = message.message?.content;
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .filter((b) => b.type === 'text' && b.text)
      .map((b) => b.text!)
      .join('\n');
  }
  return '';
}

function extractSkillNameFromText(message: MessageResponse): string {
  const text = getMessageText(message);
  const match = text.match(/^Base directory for this skill:.*\/skills\/([^\s/]+)/);
  return match ? match[1] : 'unknown';
}

function SkillLoadedMessage({ message }: { message: MessageResponse }) {
  const skillName = extractSkillNameFromText(message);
  const [expanded, setExpanded] = useState(false);
  const [showRaw, setShowRaw] = useState(false);

  const text = getMessageText(message);

  return (
    <div className="my-1 rounded-lg border border-violet-200 dark:border-violet-800/50 bg-violet-50 dark:bg-violet-900/20">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-violet-600 dark:text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-800/30 transition-colors"
      >
        <span className="material-symbols-outlined text-sm">magic_button</span>
        <span className="font-medium">Skill loaded</span>
        <span className="text-violet-400 dark:text-violet-500 font-mono">/{skillName}</span>
        <span className={`ml-auto transition-transform text-[10px] ${expanded ? 'rotate-90' : ''}`}>
          ▶
        </span>
      </button>
      {expanded && (
        <div className="border-t border-violet-200 dark:border-violet-800/50">
          <pre className="max-h-96 overflow-auto whitespace-pre-wrap px-3 py-2 text-xs text-violet-700 dark:text-violet-300">
            {text}
          </pre>
          <div className="flex justify-end px-3 py-1 border-t border-violet-200 dark:border-violet-800/50">
            <RawJsonButton onClick={() => setShowRaw(true)} />
          </div>
        </div>
      )}
      {showRaw && <RawJsonModal data={message.message} onClose={() => setShowRaw(false)} />}
    </div>
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
    <div className="flex justify-end">
      <div className="max-w-[85%]">
        {textSegments.length > 0 && (
          <div className="bg-primary text-primary-fg p-5 rounded-xl shadow-sm">
            <div className="text-[15px] leading-relaxed">
              <MessageContent segments={textSegments} rawMessage={message} variant="user" />
            </div>
          </div>
        )}
        {specialSegments.length > 0 && (
          <div className="text-sm mt-2">
            <MessageContent segments={specialSegments} rawMessage={message} />
          </div>
        )}
        <div className="mt-1 flex items-center justify-end gap-1 text-xs text-muted-fg">
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
  const rawContent = message.message?.content;
  // Guard against unexpected content shapes (e.g. object instead of string/array)
  const content = Array.isArray(rawContent) ? rawContent : [];
  if (content.length === 0) return null;

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
    <div className="space-y-4">
      {groups.map((group, gi) => {
        if (group.type === 'tool') {
          return group.blocks.map(({ block, index }) => {
            const result = block.id ? toolResults.get(block.id) : undefined;
            return <ToolCallBlock key={index} block={block} result={result} />;
          });
        }

        // Separate thinking blocks from text blocks
        const thinkingBlocks = group.blocks.filter(({ block }) => block.type === 'thinking');
        const textBlocks = group.blocks.filter(({ block }) => block.type !== 'thinking');

        return (
          <div key={gi} className="space-y-4">
            {/* Thinking blocks with their own styling */}
            {thinkingBlocks.map(({ block, index }) => (
              <ThinkingBlock
                key={index}
                thinking={block.thinking}
                isActive={!block.thinking && isLastMessage}
              />
            ))}

            {/* Text content with assistant avatar */}
            {textBlocks.length > 0 && (
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-primary-fg text-sm">
                    smart_toy
                  </span>
                </div>
                <div className="flex-1 rounded-xl bg-card shadow-sm ring-1 ring-border p-5 text-fg space-y-3">
                  {textBlocks.map(({ block, index }) => {
                    if (block.type === 'text' && typeof block.text === 'string' && block.text) {
                      const segments = processMessageContent(block.text);
                      if (segments.length === 0) return null;
                      return (
                        <div key={index} className="text-[15px] leading-relaxed">
                          <MessageContent segments={segments} rawMessage={message} />
                        </div>
                      );
                    }
                    return null;
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })}
      <div className="ml-12 flex items-center gap-2 text-xs text-muted-fg">
        <RawJsonButton onClick={() => setShowRaw(true)} />
        <span>{formatTimestamp(message.timestamp)}</span>
        {message.message?.model && (
          <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-muted-fg">
            {message.message.model}
          </span>
        )}
      </div>
      {showRaw && <RawJsonModal data={message.message} onClose={() => setShowRaw(false)} />}
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
    const content = message.message.content;
    if (Array.isArray(content) && content.every((b) => b.type === 'tool_result')) {
      return null;
    }

    // Skill expansion messages (classified by the API)
    if (message.messageKind === 'skill-expansion') {
      return <SkillLoadedMessage message={message} />;
    }

    return <UserMessage message={message} />;
  }

  if (message.type === 'assistant' && message.message) {
    return (
      <AssistantMessage message={message} toolResults={toolResults} isLastMessage={isLastMessage} />
    );
  }

  if (isAgentProgressMessage(message)) {
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

  // Unknown message type — log and render a fallback
  console.warn('Unknown message type:', message.type);
  return (
    <div className="my-1 rounded-lg border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 text-xs text-amber-600 dark:text-amber-400">
      <span className="font-medium">Unknown message type:</span>{' '}
      <span className="font-mono">{message.type}</span>
    </div>
  );
}
