import type { Dispatch, RefObject, SetStateAction } from 'react';
import { ConversationFlow } from '../components/ConversationFlow';
import { TimelineTab } from '../components/timeline-track/TimelineTab';
import type { SessionTab } from '../components/SessionTabs';
import type { TimelineController } from '../components/timeline-track/useTimeline';
import type {
  ActivityState,
  ContentBlock,
  Exchange,
  MessageResponse,
  TimelineResponse,
} from '../types';

interface SessionTabContentProps {
  tab: SessionTab;
  timeline: TimelineResponse | null;
  controller: TimelineController;
  focusedAgentId: string | null;
  onFocusAgent: (agentId: string) => void;
  setTab: (tab: SessionTab) => void;
  navigateToMessage: (uuid: string) => void;
  setSelectedExchangeIndex: Dispatch<SetStateAction<number | null>>;
  displayMessages: MessageResponse[];
  toolResults: Map<string, ContentBlock>;
  agentGroups: Map<string, MessageResponse[]>;
  agentGroupFirstIds: Set<string>;
  visibleMessages: MessageResponse[];
  activeToolResults: Map<string, ContentBlock>;
  activityState: ActivityState | undefined;
  selectedIndex: number;
  printing: boolean;
  highlightUuid: string | null;
  page: number;
  totalPages: number;
  setPage: (page: number) => void;
  scrollToEnd: () => void;
  followMode: boolean;
  setFollowMode: Dispatch<SetStateAction<boolean>>;
  missingToolResultCount: number;
  skippedLines: number | undefined;
  streamError: string | null;
  messagesEndRef: RefObject<HTMLDivElement | null>;
}

/** The scrolling body under the header: the Timeline track or the conversation. */
export function SessionTabContent(props: SessionTabContentProps) {
  const openInConversation = (exchange: Exchange) => {
    props.setTab('conversation');
    const firstUuid = exchange.messageUuids[0];
    if (firstUuid) props.navigateToMessage(firstUuid);
  };

  if (props.tab === 'timeline') {
    return (
      <div className="flex flex-1 flex-col overflow-hidden px-4 sm:px-8">
        <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col">
          <TimelineTab
            timeline={props.timeline}
            controller={props.controller}
            onClose={() => props.setSelectedExchangeIndex(null)}
            onOpenInConversation={openInConversation}
            messageContext={{
              messages: props.displayMessages,
              toolResults: props.toolResults,
              agentGroups: props.agentGroups,
              agentGroupFirstIds: props.agentGroupFirstIds,
              onFocusAgent: props.focusedAgentId ? undefined : props.onFocusAgent,
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <ConversationFlow
      visibleMessages={props.visibleMessages}
      toolResults={props.activeToolResults}
      agentGroups={props.agentGroups}
      agentGroupFirstIds={props.agentGroupFirstIds}
      onFocusAgent={props.onFocusAgent}
      activityState={props.activityState}
      selectedIndex={props.selectedIndex}
      printing={props.printing}
      highlightUuid={props.highlightUuid}
      page={props.page}
      totalPages={props.totalPages}
      onPageChange={props.setPage}
      onJumpToLatest={() => {
        props.setPage(props.totalPages - 1);
        props.scrollToEnd();
      }}
      followMode={props.followMode}
      onToggleFollow={() =>
        props.setFollowMode((prev) => {
          if (!prev) props.scrollToEnd();
          return !prev;
        })
      }
      missingToolResultCount={props.missingToolResultCount}
      skippedLines={props.skippedLines}
      streamError={props.streamError}
      messagesEndRef={props.messagesEndRef}
    />
  );
}
