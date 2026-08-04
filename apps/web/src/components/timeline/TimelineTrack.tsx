import type { TimelineResponse } from '../../types';

interface TimelineTrackProps {
  timeline: TimelineResponse | null;
}

/**
 * Timeline Track container. This is the shell that later tasks fill in with the
 * overview strip, the per-exchange track table, and the session insights
 * popover. For now it surfaces the server-provided timeline payload so the tab
 * is reachable and typed data flows through.
 */
export function TimelineTrack({ timeline }: TimelineTrackProps) {
  const exchanges = timeline?.exchanges ?? [];

  if (exchanges.length === 0) {
    return (
      <div
        data-testid="timeline-track"
        className="flex flex-1 items-center justify-center text-muted-fg"
      >
        <p>No timeline data for this session.</p>
      </div>
    );
  }

  return (
    <div data-testid="timeline-track" className="flex flex-1 flex-col overflow-y-auto p-4">
      <p className="text-sm text-muted-fg">
        {exchanges.length} exchange{exchanges.length !== 1 ? 's' : ''}
      </p>
    </div>
  );
}
