export function formatTimestamp(ts: string): string {
  return new Date(ts).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}
