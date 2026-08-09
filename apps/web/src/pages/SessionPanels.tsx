import { ConversationSearch } from '../components/ConversationSearch';
import { TimelineSearch } from '../components/timeline-track/TimelineSearch';
import { SessionInsightsSidebar } from '../components/insights/SessionInsightsSidebar';
import { buildConversationActions, buildTimelineActions } from '../components/insights/actions';
import type { SessionTab } from '../components/SessionTabs';
import type { TimelineController } from '../components/timeline-track/useTimeline';
import type {
  ContentBlock,
  SessionDetail,
  SessionInsights,
  SubagentDetail,
  TimelineResponse,
} from '../types';

interface SessionSidebarProps {
  session: SessionDetail;
  insights: SessionInsights | null;
  timeline: TimelineResponse | null;
  subagentData: SubagentDetail | undefined;
  tab: SessionTab;
  controller: TimelineController;
  navigateToMessage: (uuid: string) => void;
  setTab: (tab: SessionTab) => void;
  toolResults: Map<string, ContentBlock>;
  focusedAgentId: string | null;
  subagentLoading: boolean;
  onFocusAgent: (agentId: string) => void;
}

/**
 * One sidebar for both tabs; only the interaction wiring differs. On Timeline a
 * click filters/jumps the track; on Conversation it scrolls to the message. In
 * the subagent view we show the focused agent's insights, no timeline.
 */
export function SessionSidebar({
  session,
  insights,
  timeline,
  subagentData,
  tab,
  controller,
  navigateToMessage,
  setTab,
  toolResults,
  focusedAgentId,
  subagentLoading,
  onFocusAgent,
}: SessionSidebarProps) {
  const activeInsights = focusedAgentId ? (subagentData?.insights ?? null) : insights;
  const activeTimeline = focusedAgentId ? null : timeline;
  const actions =
    tab === 'timeline'
      ? buildTimelineActions(controller)
      : buildConversationActions({ navigateToMessage, timeline, insights, setTab, controller });

  return (
    <SessionInsightsSidebar
      insights={activeInsights}
      timeline={activeTimeline}
      actions={actions}
      toolResults={toolResults}
      filePath={focusedAgentId ? undefined : session.filePath}
      project={session.dir}
      model={session.model}
      timestamp={session.timestamp}
      sessionId={session.id}
      isSubagentView={Boolean(focusedAgentId)}
      subagentLoading={subagentLoading}
      onFocusAgent={focusedAgentId ? undefined : onFocusAgent}
    />
  );
}

interface SessionSearchSlotProps {
  tab: SessionTab;
  controller: TimelineController;
  focusedAgentId: string | null;
  sessionId: string;
  navigateToMessage: (uuid: string) => void;
}

/**
 * A single search control that scopes to the active view: the timeline filter on
 * the Timeline tab, the message search on Conversation. Hidden in the subagent view.
 */
export function SessionSearchSlot({
  tab,
  controller,
  focusedAgentId,
  sessionId,
  navigateToMessage,
}: SessionSearchSlotProps) {
  if (tab === 'timeline') {
    return (
      <TimelineSearch
        query={controller.query}
        onQueryChange={controller.setQuery}
        matchLabel={controller.matchLabel}
        onPrev={() => controller.step(-1)}
        onNext={() => controller.step(1)}
        onClear={controller.clearSearch}
      />
    );
  }
  if (focusedAgentId) return null;
  return <ConversationSearch sessionId={sessionId} onNavigateToMessage={navigateToMessage} />;
}
