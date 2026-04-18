import { useCallback, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ConversationFlow } from '../components/ConversationFlow';
import { useKeyboardNavigation } from '../hooks/useKeyboardNavigation';
import { useSettings } from '../contexts/useSettings';
import { ApiError } from '../api';
import { useSessionData } from '../hooks/useSessionData';
import { useSubagentData } from '../hooks/useSubagentData';
import { usePrintMode } from '../hooks/usePrintMode';
import { useMessagePagination } from '../hooks/useMessagePagination';
import { SessionSidebar } from '../components/SessionSidebar';
import { SessionViewHeader } from '../components/SessionViewHeader';
import { MobileSidebar } from '../components/MobileSidebar';
import { Footer } from '../components/Footer';

export function SessionView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { settings, isLoaded } = useSettings();
  const printing = usePrintMode();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [focusedAgentId, setFocusedAgentId] = useState<string | null>(null);

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
    enabled: !isLoading && paginatedMessages.length > 0,
  });
  const handleExportPdf = useCallback(() => window.print(), []);

  if (error && !session)
    return (
      <div className="mx-auto max-w-4xl p-4 sm:p-8">
        <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
          <p className="text-destructive text-sm">
            Failed to load session{error instanceof ApiError ? ` (HTTP ${error.status})` : ''}.
          </p>
          <button
            onClick={() => mutate()}
            className="shrink-0 rounded-md bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-fg hover:bg-muted transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );

  if (isLoading || !session)
    return (
      <div className="mx-auto max-w-4xl p-4 sm:p-8">
        <p className="text-muted-fg">Loading session...</p>
      </div>
    );

  const title = liveCustomTitle || session.customTitle || session.slug || session.id;
  const activityState = liveActivityState ?? session.activityState;

  const sidebarProps = {
    filePath: focusedAgentId ? undefined : session.filePath,
    project: session.dir,
    model: session.model,
    timestamp: session.timestamp,
    sessionId: session.id,
    toolResults: activeToolResults,
    insights: focusedAgentId ? (subagentData?.insights ?? null) : insights,
    onNavigateToMessage: navigateToMessage,
    focusedAgentId,
    subagentLoading,
    onFocusAgent: focusedAgentId ? undefined : handleFocusAgent,
  };

  return (
    <div className="flex flex-col lg:flex-row h-full overflow-hidden">
      <div
        className="flex-1 flex flex-col border-r border-border overflow-y-auto overflow-x-hidden"
        ref={containerRef}
        onScroll={handleScroll}
      >
        <SessionViewHeader
          sessionId={session.id}
          title={title}
          dir={session.dir}
          timestamp={session.timestamp}
          activityState={activityState}
          liveUsage={liveUsage}
          displayMessages={displayMessages}
          activeMessages={activeMessages}
          navigateToMessage={navigateToMessage}
          onExportPdf={handleExportPdf}
          onToggleSidebar={() => setSidebarOpen((v) => !v)}
          focusedAgentId={focusedAgentId}
          onExitAgent={handleExitAgent}
          subagentData={subagentData}
          subagentLoading={subagentLoading}
          subagentDisplayMessages={subagentDisplayMessages}
          focusedAgentPrompt={focusedAgentPrompt}
        />

        <ConversationFlow
          visibleMessages={visibleMessages}
          toolResults={activeToolResults}
          agentGroups={agentGroups}
          agentGroupFirstIds={agentGroupFirstIds}
          onFocusAgent={handleFocusAgent}
          activityState={activityState}
          selectedIndex={selectedIndex}
          printing={printing}
          highlightUuid={highlightUuid}
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          onJumpToLatest={() => {
            setPage(totalPages - 1);
            scrollToEnd();
          }}
          followMode={followMode}
          onToggleFollow={() =>
            setFollowMode((prev: boolean) => {
              if (!prev) scrollToEnd();
              return !prev;
            })
          }
          missingToolResultCount={missingToolResultCount}
          skippedLines={session.skippedLines}
          streamError={streamError}
          messagesEndRef={messagesEndRef}
        />
        <Footer />
      </div>
      <div className="hidden lg:block h-full overflow-y-auto">
        <SessionSidebar {...sidebarProps} />
      </div>
      <MobileSidebar
        open={sidebarOpen}
        onToggle={() => setSidebarOpen((v) => !v)}
        sidebarProps={sidebarProps}
      />
    </div>
  );
}
