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
          className={`cursor-pointer border-l-2 ${borderColor} py-0.5 pl-2 pr-2 text-xs ${labelColor} hover:opacity-70 text-left break-all`}
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

export function SystemMessage({ message }: { message: MessageResponse }) {
  const label = message.type === 'progress' ? 'Progress' : 'System';
  const detail =
    message.data && typeof message.data === 'object' ? JSON.stringify(message.data) : '';

  return (
    <EventMessage
      message={message}
      label={label}
      borderColor="border-gray-200 dark:border-gray-700"
      labelColor="text-gray-400 dark:text-gray-500"
      detailColor="text-gray-300 dark:text-gray-600"
      detailText={detail}
    />
  );
}
