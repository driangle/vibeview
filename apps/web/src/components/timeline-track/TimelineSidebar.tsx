import type { TimelineResponse } from '../../types';
import type { TimelineController } from './useTimeline';
import { SessionInsightsContent } from './SessionInsightsContent';

interface TimelineSidebarProps {
  timeline: TimelineResponse | null;
  controller: TimelineController;
}

/**
 * The Timeline tab's sidebar: the session insights (time split, headline tiles,
 * and per-model / files / commands / skills / tools breakdown). Mirrors
 * {@link ../SessionSidebar} in shell and placement so each tab owns its own
 * sidebar content. Every row/tile click filters or jumps the track via the
 * shared {@link TimelineController}.
 */
export function TimelineSidebar({ timeline, controller }: TimelineSidebarProps) {
  return (
    <aside className="w-full lg:w-80 shrink-0 bg-surface-dim p-4 sm:p-6 overflow-y-auto print:hidden">
      {timeline ? (
        <div className="space-y-3">
          <h2 className="text-[10px] font-medium tracking-wider text-muted-fg uppercase">
            Session insights
          </h2>
          <SessionInsightsContent
            insights={timeline.insights}
            exchanges={controller.allExchanges}
            onSearch={controller.setQuery}
            onJumpToFirstError={controller.onJumpToFirstError}
            onJumpToLongest={controller.onJumpToLongest}
            onJumpToCostliest={controller.onJumpToCostliest}
          />
        </div>
      ) : (
        <p className="text-muted-fg text-xs">No timeline data.</p>
      )}
    </aside>
  );
}
