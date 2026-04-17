import { useState } from 'react';
import type { MessageResponse } from '../types';
import { RawJsonModal } from './RawJsonModal';

function formatTimestamp(ts: string): string {
  return new Date(ts).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Renders a user message that arrived via an external channel (e.g. an
 * agent runner pushing a message into a running session). Channel messages
 * are visually distinct from interactive user messages so they can be
 * recognised at a glance.
 */
export function ChannelMessage({ message }: { message: MessageResponse }) {
  const info = message.channelInfo;
  const [showRaw, setShowRaw] = useState(false);
  if (!info) return null;

  const label = info.sourceName || info.source || 'channel';

  return (
    <div className="flex justify-end">
      <div className="max-w-[85%]">
        <div className="rounded-xl border border-cyan-300 dark:border-cyan-700/60 bg-cyan-50 dark:bg-cyan-900/20 shadow-sm">
          <div className="flex items-center gap-2 border-b border-cyan-200 dark:border-cyan-800/60 px-4 py-2 text-xs text-cyan-700 dark:text-cyan-300">
            <span className="material-symbols-outlined text-sm">forum</span>
            <span className="font-semibold">Channel message</span>
            <span className="text-cyan-500 dark:text-cyan-400">·</span>
            <span className="font-mono">{label}</span>
            {info.source && info.sourceName && (
              <span className="font-mono text-cyan-500 dark:text-cyan-400">({info.source})</span>
            )}
            {info.replyTo && (
              <span className="ml-auto font-mono text-[10px] text-cyan-500 dark:text-cyan-400">
                reply_to: {info.replyTo}
              </span>
            )}
          </div>
          <pre className="whitespace-pre-wrap break-words px-4 py-3 text-[14px] leading-relaxed text-cyan-900 dark:text-cyan-100 font-sans">
            {info.content}
          </pre>
          {info.sourceId && (
            <div className="border-t border-cyan-200 dark:border-cyan-800/60 px-4 py-1.5 text-[10px] font-mono text-cyan-500 dark:text-cyan-400">
              source_id: {info.sourceId}
            </div>
          )}
        </div>
        <div className="mt-1 flex items-center justify-end gap-1 text-xs text-muted-fg">
          <button
            onClick={() => setShowRaw(true)}
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
          {formatTimestamp(message.timestamp)}
        </div>
      </div>
      {showRaw && <RawJsonModal data={message.message} onClose={() => setShowRaw(false)} />}
    </div>
  );
}
