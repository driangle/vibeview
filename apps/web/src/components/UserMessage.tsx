import { useState } from 'react';
import type { MessageResponse } from '../types';
import { processMessageContent } from '../lib/parsers';
import { MessageContent } from './MessageContent';
import { RawJsonModal } from './RawJsonModal';
import { formatTimestamp } from '../lib/formatters';
import { RawJsonButton } from './RawJsonButton';

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

export function SkillLoadedMessage({ message }: { message: MessageResponse }) {
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

export function UserMessage({ message }: { message: MessageResponse }) {
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
          <div className="bg-primary text-primary-fg p-5 rounded-xl shadow-sm overflow-hidden">
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
