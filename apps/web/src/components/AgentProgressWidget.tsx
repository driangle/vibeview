import { useState } from 'react';
import type { MessageResponse, ContentBlock } from '../types';
import { ToolCallBlock } from './ToolCallBlock';
import { processMessageContent } from '../lib/parsers';
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
            <div key={i} className="rounded bg-card px-3 py-2 text-xs text-fg">
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
    <div className="ml-12 border border-info/25 bg-info/5 rounded overflow-hidden shadow-sm">
      {/* Header bar */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full bg-info/10 px-3 py-1.5 flex items-center justify-between border-b border-info/25 hover:bg-info/20 transition-colors"
      >
        <span className="font-headline text-[10px] text-info flex items-center gap-2">
          <span className="material-symbols-outlined text-xs">smart_toy</span>
          AGENT
        </span>
        <span className="text-[10px] font-headline text-info flex items-center gap-2">
          <span className="rounded bg-info/15 px-1.5 py-0.5 font-mono">
            {messages.length} turns
          </span>
        </span>
      </button>

      {/* Preview body */}
      <div className="p-4 bg-info/5 font-mono text-xs text-muted-fg space-y-1">
        <div className="text-info font-bold">&gt; {promptPreview}</div>
      </div>

      {/* Expanded conversation */}
      {expanded && (
        <div className="border-t border-info/25">
          <div className="px-4 py-3">
            <div className="mb-1 text-xs font-headline font-bold text-info uppercase">Prompt</div>
            <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded bg-card p-2 text-xs text-fg">
              {prompt}
            </pre>
          </div>
          <div className="border-t border-info/25 px-4 py-3 space-y-2">
            <div className="text-xs font-headline font-bold text-info uppercase">Conversation</div>
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

      {/* Expand toggle */}
      {!expanded && (
        <button
          onClick={() => setExpanded(true)}
          className="w-full px-4 py-1.5 text-[10px] font-headline text-info hover:text-fg hover:bg-info/10 transition-colors text-center uppercase tracking-wider border-t border-info/25"
        >
          Show details
        </button>
      )}
    </div>
  );
}
