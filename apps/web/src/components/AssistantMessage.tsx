import { useState } from 'react';
import type { MessageResponse, ContentBlock } from '../types';
import { ThinkingBlock } from './ThinkingBlock';
import { ToolCallBlock } from './ToolCallBlock';
import { processMessageContent } from '../lib/parsers';
import { MessageContent } from './MessageContent';
import { RawJsonModal } from './RawJsonModal';
import { formatTimestamp } from '../lib/formatters';
import { RawJsonButton } from './RawJsonButton';

export function AssistantMessage({
  message,
  toolResults,
  isLastMessage,
  onFocusAgent,
}: {
  message: MessageResponse;
  toolResults: Map<string, ContentBlock>;
  isLastMessage?: boolean;
  onFocusAgent?: (agentId: string) => void;
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
            return (
              <ToolCallBlock
                key={index}
                block={block}
                result={result}
                onFocusAgent={onFocusAgent}
              />
            );
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
