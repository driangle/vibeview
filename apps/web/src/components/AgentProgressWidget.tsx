import { useState } from 'react';
import type { MessageResponse, ContentBlock } from '../types';
import { ToolCallBlock } from './ToolCallBlock';
import { processMessageContent } from './processMessageContent';
import { MessageContent } from './MessageContent';

interface AgentProgressWidgetProps {
  messages: MessageResponse[];
}

function buildSubagentToolResults(messages: MessageResponse[]): Map<string, ContentBlock> {
  const map = new Map<string, ContentBlock>();
  for (const msg of messages) {
    const inner = msg.data?.message as
      | { type: string; message?: { content: ContentBlock[] | string } }
      | undefined;
    if (inner?.type !== 'user' || !inner.message) continue;
    const content = inner.message.content;
    if (!Array.isArray(content)) continue;
    for (const block of content) {
      if (block.type === 'tool_result' && block.tool_use_id) {
        map.set(block.tool_use_id, block);
      }
    }
  }
  return map;
}

function SubagentTurn({
  turn,
  toolResults,
  parentMessage,
}: {
  turn: { type: string; message?: { content: ContentBlock[] | string } };
  toolResults: Map<string, ContentBlock>;
  parentMessage: MessageResponse;
}) {
  if (turn.type === 'user') return null;
  if (turn.type !== 'assistant' || !turn.message) return null;

  const content = turn.message.content;
  if (!Array.isArray(content)) return null;

  return (
    <>
      {content.map((block, i) => {
        if (block.type === 'tool_use') {
          const result = block.id ? toolResults.get(block.id) : undefined;
          return <ToolCallBlock key={i} block={block} result={result} />;
        }
        if (block.type === 'text' && block.text) {
          const segments = processMessageContent(block.text);
          if (segments.length === 0) return null;
          return (
            <div
              key={i}
              className="rounded bg-white dark:bg-gray-900 px-3 py-2 text-xs text-gray-800 dark:text-gray-300"
            >
              <MessageContent segments={segments} rawMessage={parentMessage} />
            </div>
          );
        }
        return null;
      })}
    </>
  );
}

export function AgentProgressWidget({ messages }: AgentProgressWidgetProps) {
  const [expanded, setExpanded] = useState(false);

  if (messages.length === 0) return null;

  const firstData = messages[0].data;
  const prompt = String(firstData?.prompt ?? 'Agent');
  const promptPreview = prompt.length > 120 ? prompt.slice(0, 120) + '...' : prompt;
  const toolResults = buildSubagentToolResults(messages);

  const turns = messages
    .map((msg) => ({
      turn: msg.data?.message as
        | { type: string; message?: { content: ContentBlock[] | string } }
        | undefined,
      parentMessage: msg,
    }))
    .filter(
      (t): t is { turn: NonNullable<typeof t.turn>; parentMessage: MessageResponse } =>
        t.turn != null,
    );

  return (
    <div className="my-2 rounded border border-violet-200 dark:border-violet-700 bg-violet-50 dark:bg-violet-900/30">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-violet-100 dark:hover:bg-violet-900/50"
      >
        <span className={`transition-transform ${expanded ? 'rotate-90' : ''}`}>▶</span>
        <span className="rounded bg-violet-200 dark:bg-violet-800 px-1.5 py-0.5 font-medium text-violet-800 dark:text-violet-200">
          Agent
        </span>
        <span className="rounded bg-violet-100 dark:bg-violet-800/50 px-1.5 py-0.5 font-mono text-violet-600 dark:text-violet-300">
          {messages.length}
        </span>
        {!expanded && (
          <span className="truncate text-gray-600 dark:text-gray-400">{promptPreview}</span>
        )}
      </button>
      {expanded && (
        <div className="border-t border-violet-200 dark:border-violet-700">
          <div className="px-3 py-2">
            <div className="mb-2 text-xs font-medium text-violet-600 dark:text-violet-400">
              Prompt
            </div>
            <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded bg-white dark:bg-gray-900 p-2 text-xs text-gray-800 dark:text-gray-300">
              {prompt}
            </pre>
          </div>
          <div className="border-t border-violet-200 dark:border-violet-700 px-3 py-2 space-y-2">
            <div className="text-xs font-medium text-violet-600 dark:text-violet-400">
              Conversation
            </div>
            {turns.map(({ turn, parentMessage }, i) => (
              <SubagentTurn
                key={i}
                turn={turn}
                toolResults={toolResults}
                parentMessage={parentMessage}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
