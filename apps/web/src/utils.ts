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
  return date.toLocaleDateString();
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
