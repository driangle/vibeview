import type { Exchange, SessionInsights, TimelineResponse } from '../../types';
import type { SessionTab } from '../SessionTabs';
import type { TimelineController } from '../timeline-track/useTimeline';

/**
 * The tab-aware interaction contract the Session Insights sidebar depends on. The
 * sidebar and its sections are tab-agnostic — they only call these methods; the
 * meaning of each call ("filter the track" vs. "scroll the conversation") is
 * decided by which factory built the object.
 */
export interface InsightsActions {
  /** A file / command / skill / tool / model row, or a locate button. */
  onEntity(target: EntityTarget): void;
  /** The Overview "errors" tile. */
  onJumpToFirstError(): void;
  /** The Overview "longest run" tile. */
  onJumpToLongest(): void;
  /** The Overview "token share" tile. */
  onJumpToCostliest(): void;
}

/**
 * What an entity click points at. `query` is the timeline filter string (empty
 * for entities with no timeline field, e.g. errors/worktrees). `messageUuid` is
 * the first message that involved it (absent for models/time-split segments).
 */
export interface EntityTarget {
  query: string;
  messageUuid?: string;
}

/** The heaviest (most tokens) exchange, or undefined when there are none. */
export function costliestExchange(timeline: TimelineResponse | null): Exchange | undefined {
  const exchanges = timeline?.exchanges ?? [];
  return exchanges.reduce<Exchange | undefined>(
    (max, e) => (max === undefined || e.tokens > max.tokens ? e : max),
    undefined,
  );
}

/**
 * Timeline-tab actions: an entity click filters the track by its query, or (when
 * it has no query) jumps to the exchange containing its message; the tiles run
 * the controller's jumps.
 */
export function buildTimelineActions(controller: TimelineController): InsightsActions {
  return {
    onEntity: (t) => {
      if (t.query) {
        controller.setQuery(t.query);
        return;
      }
      if (t.messageUuid) {
        const ex = controller.allExchanges.find((e) => e.messageUuids.includes(t.messageUuid!));
        if (ex) {
          controller.reset();
          controller.onSelectIndex(ex.index);
        }
      }
    },
    onJumpToFirstError: controller.onJumpToFirstError,
    onJumpToLongest: controller.onJumpToLongest,
    onJumpToCostliest: controller.onJumpToCostliest,
  };
}

/**
 * Conversation-tab actions: an entity click scrolls the conversation to its
 * message, or (when it has no message — models, time-split) falls back to
 * switching to the Timeline tab and filtering there, so we never filter an
 * invisible track. The tiles resolve the right exchange's first message.
 */
export function buildConversationActions({
  navigateToMessage,
  timeline,
  insights,
  setTab,
  controller,
}: {
  navigateToMessage: (uuid: string) => void;
  timeline: TimelineResponse | null;
  insights: SessionInsights | null;
  setTab: (tab: SessionTab) => void;
  controller: TimelineController;
}): InsightsActions {
  const nav = (uuid?: string) => {
    if (uuid) navigateToMessage(uuid);
  };
  const longest = () => {
    const idx = timeline?.insights.longestExchangeIndex ?? -1;
    return timeline?.exchanges.find((e) => e.index === idx);
  };
  return {
    onEntity: (t) => {
      if (t.messageUuid) {
        navigateToMessage(t.messageUuid);
        return;
      }
      if (t.query) {
        setTab('timeline');
        controller.setQuery(t.query);
      }
    },
    onJumpToFirstError: () => nav(insights?.errors[0]?.messageUuid),
    onJumpToLongest: () => nav(longest()?.messageUuids[0]),
    onJumpToCostliest: () => nav(costliestExchange(timeline)?.messageUuids[0]),
  };
}
