import type { MessageResponse } from './types';

export function formatDate(timestamp: string): string {
  return new Date(timestamp).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatTokenCount(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}k`;
  return count.toString();
}

export function formatCost(usd: number): string {
  return `$${usd.toFixed(2)}`;
}

export function formatDuration(messages: MessageResponse[]): string | null {
  if (messages.length < 2) return null;
  let first = NaN;
  let last = NaN;
  for (let i = 0; i < messages.length; i++) {
    const t = new Date(messages[i].timestamp).getTime();
    if (Number.isFinite(t)) {
      first = t;
      break;
    }
  }
  for (let i = messages.length - 1; i >= 0; i--) {
    const t = new Date(messages[i].timestamp).getTime();
    if (Number.isFinite(t)) {
      last = t;
      break;
    }
  }
  const diffMs = last - first;
  if (!Number.isFinite(diffMs) || diffMs <= 0) return null;

  const seconds = Math.floor(diffMs / 1000);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${secs}s`;
  return `${secs}s`;
}

/**
 * Format a millisecond duration as a compact human label: "<1s", "45s",
 * "3m 20s", "1h 5m". Shared by the timeline components that render an
 * exchange's active duration. For durations built from a message list use
 * {@link formatDuration} instead.
 */
export function formatDurationMs(ms: number): string {
  if (ms < 1000) return '<1s';
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    const remaining = seconds % 60;
    return remaining > 0 ? `${minutes}m ${remaining}s` : `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

/**
 * Format a millisecond offset as an elapsed clock: "mm:ss", or "h:mm:ss" once
 * past an hour. Used to label positions along the timeline axis.
 */
export function formatClock(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  if (hours > 0) return `${hours}:${pad(minutes)}:${pad(seconds)}`;
  return `${pad(minutes)}:${pad(seconds)}`;
}

export function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString([], { timeZone: 'UTC' });
}

export function projectName(project: string, allProjects?: string[]): string {
  const parts = project.split('/').filter(Boolean);
  const name = parts[parts.length - 1] || project;

  if (allProjects) {
    const duplicates = allProjects.filter(
      (p) => p !== project && (p.split('/').filter(Boolean).pop() || p) === name,
    );
    if (duplicates.length > 0 && parts.length >= 2) {
      return `${parts[parts.length - 2]}/${name}`;
    }
  }

  return name;
}
