import { useCallback, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { SessionTabs, type SessionTab } from '../components/SessionTabs';
import { useTimeline } from '../components/timeline-track/useTimeline';
import { useKeyboardNavigation } from '../hooks/useKeyboardNavigation';
import { useSettings } from '../contexts/useSettings';
import { useSessionData } from '../hooks/useSessionData';
import { useSubagentData } from '../hooks/useSubagentData';
import { usePrintMode } from '../hooks/usePrintMode';
import { useMessagePagination } from '../hooks/useMessagePagination';
import { SessionViewHeader } from '../components/SessionViewHeader';
import { MobileSidebar } from '../components/MobileSidebar';
import { Footer } from '../components/Footer';
import { SessionErrorState, SessionLoadingState } from './SessionStates';
import { SessionSidebar, SessionSearchSlot } from './SessionPanels';
import { SessionTabContent } from './SessionTabContent';

export function SessionView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { settings, isLoaded } = useSettings();
  const printing = usePrintMode();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [focusedAgentId, setFocusedAgentId] = useState<string | null>(null);
  const [tab, setTab] = useState<SessionTab>('conversation');
  const [selectedExchangeIndex, setSelectedExchangeIndex] = useState<number | null>(null);

  const {
    session,
    error,
    isLoading,
    mutate,
    streamedMessages,
    streamError,
    toolResults,
    missingToolResultCount,
    liveUsage,
    liveCustomTitle,
    liveActivityState,
    displayMessages,
    insights,
    timeline,
    agentGroups,
    agentGroupFirstIds,
  } = useSessionData(id);

  const {
    subagentData,
    subagentLoading,
    subagentToolResults,
    subagentDisplayMessages,
    focusedAgentPrompt,
  } = useSubagentData(id, focusedAgentId, insights);

  const activeMessages = focusedAgentId ? subagentDisplayMessages : displayMessages;
  const activeToolResults = focusedAgentId ? subagentToolResults : toolResults;

  const handleFocusAgent = useCallback((agentId: string) => setFocusedAgentId(agentId), []);
  const handleExitAgent = useCallback(() => setFocusedAgentId(null), []);

  const timelineController = useTimeline({
    timeline,
    selectedIndex: selectedExchangeIndex,
    onSelectIndex: setSelectedExchangeIndex,
  });

  const {
    page,
    totalPages,
    visibleMessages,
    paginatedMessages,
    followMode,
    setFollowMode,
    setPage,
    onPrevPage,
    onNextPage,
    navigateToMessage,
    highlightUuid,
    messagesEndRef,
    containerRef,
    handleScroll,
    scrollToEnd,
  } = useMessagePagination({
    messages: activeMessages,
    messagesPerPage: settings.messagesPerPage,
    autoFollow: settings.autoFollow,
    isSettingsLoaded: isLoaded,
    printing,
    streamedMessageCount: focusedAgentId ? 0 : streamedMessages.length,
  });
  const onBack = useCallback(() => navigate(-1), [navigate]);
  const { selectedIndex } = useKeyboardNavigation({
    itemCount: paginatedMessages.length,
    onBack,
    onPrevPage: totalPages > 1 ? onPrevPage : undefined,
    onNextPage: totalPages > 1 ? onNextPage : undefined,
    enabled: tab === 'conversation' && !isLoading && paginatedMessages.length > 0,
  });
  const handleExportPdf = useCallback(() => window.print(), []);

  if (error && !session) return <SessionErrorState error={error} onRetry={() => mutate()} />;
  if (isLoading || !session) return <SessionLoadingState />;

  const title = liveCustomTitle || session.customTitle || session.slug || session.id;
  const activityState = liveActivityState ?? session.activityState;
  const sidebarContent = (
    <SessionSidebar
      session={session}
      insights={insights}
      timeline={timeline}
      subagentData={subagentData}
      tab={tab}
      controller={timelineController}
      navigateToMessage={navigateToMessage}
      setTab={setTab}
      toolResults={activeToolResults}
      focusedAgentId={focusedAgentId}
      subagentLoading={subagentLoading}
      onFocusAgent={handleFocusAgent}
    />
  );

  return (
    <div className="flex flex-col lg:flex-row h-full overflow-hidden">
      <div
        className="flex-1 flex flex-col border-r border-border overflow-y-auto overflow-x-hidden"
        ref={containerRef}
        onScroll={handleScroll}
      >
        {/* Header + tabs pin together so both stay visible while content scrolls. */}
        <div className="sticky top-0 z-10 bg-[var(--color-card)]">
          <SessionViewHeader
            sessionId={session.id}
            title={title}
            dir={session.dir}
            timestamp={session.timestamp}
            activityState={activityState}
            liveUsage={liveUsage}
            displayMessages={displayMessages}
            sessionDurationMs={timeline ? timeline.insights.totalSpanMs : null}
            search={
              <SessionSearchSlot
                tab={tab}
                controller={timelineController}
                focusedAgentId={focusedAgentId}
                sessionId={session.id}
                navigateToMessage={navigateToMessage}
              />
            }
            onExportPdf={handleExportPdf}
            onToggleSidebar={() => setSidebarOpen((v) => !v)}
            focusedAgentId={focusedAgentId}
            onExitAgent={handleExitAgent}
            subagentData={subagentData}
            subagentLoading={subagentLoading}
            subagentDisplayMessages={subagentDisplayMessages}
            focusedAgentPrompt={focusedAgentPrompt}
          />
          <SessionTabs value={tab} onChange={setTab} />
        </div>

        <SessionTabContent
          tab={tab}
          timeline={timeline}
          controller={timelineController}
          focusedAgentId={focusedAgentId}
          onFocusAgent={handleFocusAgent}
          setTab={setTab}
          navigateToMessage={navigateToMessage}
          setSelectedExchangeIndex={setSelectedExchangeIndex}
          displayMessages={displayMessages}
          toolResults={toolResults}
          agentGroups={agentGroups}
          agentGroupFirstIds={agentGroupFirstIds}
          visibleMessages={visibleMessages}
          activeToolResults={activeToolResults}
          activityState={activityState}
          selectedIndex={selectedIndex}
          printing={printing}
          highlightUuid={highlightUuid}
          page={page}
          totalPages={totalPages}
          setPage={setPage}
          scrollToEnd={scrollToEnd}
          followMode={followMode}
          setFollowMode={setFollowMode}
          missingToolResultCount={missingToolResultCount}
          skippedLines={session.skippedLines}
          streamError={streamError}
          messagesEndRef={messagesEndRef}
        />
        <Footer />
      </div>
      <div className="hidden lg:block h-full overflow-y-auto">{sidebarContent}</div>
      <MobileSidebar open={sidebarOpen} onToggle={() => setSidebarOpen((v) => !v)}>
        {sidebarContent}
      </MobileSidebar>
    </div>
  );
}
