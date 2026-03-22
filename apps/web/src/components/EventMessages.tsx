import { useState } from 'react';
import type { MessageResponse } from '../types';
import { RawJsonModal } from './RawJsonModal';

function EventMessage({
  message,
  label,
  borderColor,
  labelColor,
  detailColor,
  detailText,
}: {
  message: MessageResponse;
  label: string;
  borderColor: string;
  labelColor: string;
  detailColor: string;
  detailText: string;
}) {
  const [showJson, setShowJson] = useState(false);

  return (
    <>
      <div className="flex items-center">
        <button
          onClick={() => setShowJson(true)}
          className={`border-l-2 ${borderColor} py-0.5 pl-2 pr-2 text-xs ${labelColor} hover:opacity-70 text-left break-all`}
        >
          <span className="font-medium">{label}</span>
          {detailText && <span className={`ml-1.5 ${detailColor}`}>{detailText}</span>}
        </button>
      </div>
      {showJson && message.data && (
        <RawJsonModal data={message.data} onClose={() => setShowJson(false)} />
      )}
    </>
  );
}

export function HookMessage({ message }: { message: MessageResponse }) {
  const hookName = String(message.data?.hookName ?? 'unknown');
  const command = message.data?.command ? String(message.data.command) : '';
  const detailText = command ? `${hookName} → ${command}` : hookName;

  return (
    <EventMessage
      message={message}
      label="Hook"
      borderColor="border-stone-300 dark:border-stone-600"
      labelColor="text-stone-500 dark:text-stone-400"
      detailColor="text-stone-400 dark:text-stone-500"
      detailText={detailText}
    />
  );
}

function extractTextContent(message: MessageResponse): string | null {
  // Check top-level content field (present on system messages)
  if (message.content) return message.content;
  // Check nested message content (APIMessage content blocks)
  const content = message.message?.content;
  if (typeof content === 'string') return content || null;
  if (!Array.isArray(content)) return null;
  const text = content
    .filter((b) => b.type === 'text' && b.text)
    .map((b) => b.text!)
    .join('\n');
  return text || null;
}

function formatSubtype(subtype: string): string {
  return subtype.replace(/_/g, ' ');
}

export function SystemMessage({ message }: { message: MessageResponse }) {
  const [expanded, setExpanded] = useState(false);
  const label = message.type === 'progress' ? 'Progress' : 'System';
  const textContent = extractTextContent(message);
  const subtype = message.data?.subtype as string | undefined;
  const hasData = message.data && Object.keys(message.data).length > 0;
  const expandableContent = textContent || (hasData ? JSON.stringify(message.data, null, 2) : null);

  // Nothing to show — render a minimal non-interactive label
  if (!expandableContent) {
    return (
      <div className="flex items-center">
        <span className="border-l-2 border-gray-200 dark:border-gray-700 py-0.5 pl-2 pr-2 text-xs text-gray-400 dark:text-gray-500">
          <span className="font-medium">{label}</span>
        </span>
      </div>
    );
  }

  const preview = textContent
    ? textContent.slice(0, 120).replace(/\n/g, ' ')
    : subtype
      ? formatSubtype(subtype)
      : '';

  return (
    <div className="my-1 rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50"
      >
        <span className={`transition-transform ${expanded ? 'rotate-90' : ''}`}>▶</span>
        <span className="font-medium">{label} message</span>
        {!expanded && preview && (
          <span className="truncate text-gray-400 dark:text-gray-500">{preview}</span>
        )}
      </button>
      {expanded && (
        <pre className="max-h-96 overflow-auto whitespace-pre-wrap border-t border-gray-200 dark:border-gray-700 px-3 py-2 text-xs text-gray-600 dark:text-gray-400">
          {expandableContent}
        </pre>
      )}
    </div>
  );
}
