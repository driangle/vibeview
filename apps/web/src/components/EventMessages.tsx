import type { MessageResponse } from '../types';
import { EventMessage } from './EventMessage';

// Snake_case payload values (e.g. "five_hour") read better with spaces.
function humanize(value: string): string {
  return value.replace(/_/g, ' ');
}

export function QueueOperationMessage({ message }: { message: MessageResponse }) {
  const operation = String(message.data?.operation ?? 'unknown');
  const isEnqueue = operation === 'enqueue';
  const label = isEnqueue ? 'Enqueued' : 'Dequeued';
  const content = message.content || '';
  const preview = content ? content.slice(0, 120).replace(/\n/g, ' ') : '';

  return (
    <EventMessage
      message={message}
      label={label}
      borderColor={
        isEnqueue
          ? 'border-blue-300 dark:border-blue-600'
          : 'border-amber-300 dark:border-amber-600'
      }
      labelColor={
        isEnqueue ? 'text-blue-500 dark:text-blue-400' : 'text-amber-500 dark:text-amber-400'
      }
      detailColor={
        isEnqueue ? 'text-blue-400 dark:text-blue-500' : 'text-amber-400 dark:text-amber-500'
      }
      detailText={preview}
    />
  );
}

export function LastPromptMessage({ message }: { message: MessageResponse }) {
  const prompt = message.data?.lastPrompt ? String(message.data.lastPrompt) : '';
  const preview = prompt ? prompt.slice(0, 120).replace(/\n/g, ' ') : '';

  return (
    <EventMessage
      message={message}
      label="Last prompt"
      borderColor="border-violet-300 dark:border-violet-600"
      labelColor="text-violet-500 dark:text-violet-400"
      detailColor="text-violet-400 dark:text-violet-500"
      detailText={preview}
    />
  );
}

export function PermissionModeMessage({ message }: { message: MessageResponse }) {
  const mode = message.permissionMode ?? 'unknown';

  return (
    <EventMessage
      message={message}
      label="Permission mode"
      borderColor="border-emerald-300 dark:border-emerald-600"
      labelColor="text-emerald-500 dark:text-emerald-400"
      detailColor="text-emerald-400 dark:text-emerald-500"
      detailText={mode}
    />
  );
}

export function ModeMessage({ message }: { message: MessageResponse }) {
  const mode = message.data?.mode ? String(message.data.mode) : 'unknown';

  return (
    <EventMessage
      message={message}
      label="Mode"
      borderColor="border-indigo-300 dark:border-indigo-600"
      labelColor="text-indigo-500 dark:text-indigo-400"
      detailColor="text-indigo-400 dark:text-indigo-500"
      detailText={mode}
    />
  );
}

export function RateLimitEventMessage({ message }: { message: MessageResponse }) {
  const info = (message.data?.rate_limit_info ?? {}) as Record<string, unknown>;
  const limitType = info.rateLimitType ? String(info.rateLimitType) : 'unknown';
  const status = info.status ? String(info.status) : 'unknown';
  const detailText = `${humanize(limitType)} · ${status}`;

  return (
    <EventMessage
      message={message}
      label="Rate limit"
      borderColor="border-rose-300 dark:border-rose-600"
      labelColor="text-rose-500 dark:text-rose-400"
      detailColor="text-rose-400 dark:text-rose-500"
      detailText={detailText}
      rawData={info}
    />
  );
}

export function ResultMessage({ message }: { message: MessageResponse }) {
  const data = (message.data ?? {}) as Record<string, unknown>;
  const subtype = data.subtype ? String(data.subtype) : data.is_error ? 'error' : 'success';

  const parts = [humanize(subtype)];
  if (typeof data.duration_ms === 'number') {
    parts.push(`${(data.duration_ms / 1000).toFixed(1)}s`);
  }
  if (typeof data.num_turns === 'number') {
    parts.push(`${data.num_turns} turn${data.num_turns === 1 ? '' : 's'}`);
  }
  const cost = data.total_cost_usd ?? message.total_cost_usd;
  if (typeof cost === 'number' && cost > 0) {
    parts.push(`$${cost.toFixed(4)}`);
  }

  return (
    <EventMessage
      message={message}
      label="Result"
      borderColor="border-teal-300 dark:border-teal-600"
      labelColor="text-teal-500 dark:text-teal-400"
      detailColor="text-teal-400 dark:text-teal-500"
      detailText={parts.join(' · ')}
    />
  );
}

export function AttachmentMessage({ message }: { message: MessageResponse }) {
  const attachmentType = String(message.attachment?.type ?? 'unknown');
  const label = humanize(attachmentType);

  return (
    <EventMessage
      message={message}
      label="Attachment"
      borderColor="border-cyan-300 dark:border-cyan-600"
      labelColor="text-cyan-500 dark:text-cyan-400"
      detailColor="text-cyan-400 dark:text-cyan-500"
      detailText={label}
      rawData={message.attachment}
    />
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
