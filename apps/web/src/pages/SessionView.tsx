import { useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ActivityBadge } from '../components/ActivityBadge';
import { MessageBubble } from '../components/MessageBubble';
import { CopyableText } from '../components/CopyableText';
import { Pagination, FollowToggle } from '../components/SessionControls';
import { WorkingIndicator } from '../components/WorkingIndicator';
import { useKeyboardNavigation } from '../hooks/useKeyboardNavigation';
import { useSettings } from '../contexts/useSettings';
import { ApiError } from '../api';
import { useSessionData } from '../hooks/useSessionData';
import { usePrintMode } from '../hooks/usePrintMode';
import { useMessagePagination } from '../hooks/useMessagePagination';
import { ConversationSearch } from '../components/ConversationSearch';
import { SessionSidebar } from '../components/SessionSidebar';
import type { UsageTotals } from '../types';
import { formatDate, formatTokenCount, formatCost, formatDuration, projectName } from '../utils';

function InlineMetrics({ usage }: { usage: UsageTotals }) {
  const totalTokens =
    usage.inputTokens +
    usage.outputTokens +
    usage.cacheCreationInputTokens +
    usage.cacheReadInputTokens;

  if (totalTokens === 0) return null;

  return (
    <div className="flex gap-6 border-l border-border pl-6 h-fit">
      <div className="flex flex-col">
        <span className="font-headline text-[10px] text-muted-fg uppercase tracking-tighter">
          Tokens
        </span>
        <span className="font-headline text-xl font-medium text-fg">
          {formatTokenCount(totalTokens)}
        </span>
      </div>
      <div className="flex flex-col">
        <span className="font-headline text-[10px] text-muted-fg uppercase tracking-tighter">
          Cost
        </span>
        <span className="font-headline text-xl font-medium text-fg">
          {formatCost(usage.costUSD)}
        </span>
      </div>
    </div>
  );
}

export function SessionView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { settings, isLoaded } = useSettings();
  const printing = usePrintMode();

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
    messages: displayMessages,
    messagesPerPage: settings.messagesPerPage,
    autoFollow: settings.autoFollow,
    isSettingsLoaded: isLoaded,
    printing,
    streamedMessageCount: streamedMessages.length,
  });

  const onBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  const { selectedIndex } = useKeyboardNavigation({
    itemCount: paginatedMessages.length,
    onBack,
    onPrevPage: totalPages > 1 ? onPrevPage : undefined,
    onNextPage: totalPages > 1 ? onNextPage : undefined,
    enabled: !isLoading && paginatedMessages.length > 0,
  });

  const handleExportPdf = useCallback(() => {
    window.print();
  }, []);

  if (error && !session) {
    return (
      <div className="mx-auto max-w-4xl p-8">
        <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
          <p className="text-destructive text-sm">
            Failed to load session
            {error instanceof ApiError ? ` (HTTP ${error.status})` : ''}.
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
  }

  if (isLoading || !session) {
    return (
      <div className="mx-auto max-w-4xl p-8">
        <p className="text-muted-fg">Loading session...</p>
      </div>
    );
  }

  const title = liveCustomTitle || session.customTitle || session.slug || session.id;
  const activityState = liveActivityState ?? session.activityState;

  return (
    <div className="flex flex-col lg:flex-row min-h-[calc(100vh-theme(spacing.16))]">
      {/* Content Canvas */}
      <div
        className="flex-1 flex flex-col border-r border-border overflow-y-auto"
        ref={containerRef}
        onScroll={handleScroll}
      >
        {/* Session Header */}
        <section className="sticky top-0 z-10 px-8 py-4 border-b border-border bg-card">
          <div className="max-w-3xl mx-auto space-y-2">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <CopyableText
                  text={session.id}
                  className="font-headline text-[10px] uppercase tracking-widest px-2 py-0.5 bg-tertiary-container text-tertiary-container-fg rounded cursor-pointer"
                >
                  ID: {session.id.slice(0, 8).toUpperCase()}
                </CopyableText>
                <ActivityBadge state={activityState} />
              </div>
              <div className="flex items-center gap-4">
                {liveUsage && <InlineMetrics usage={liveUsage} />}
                <ConversationSearch
                  messages={displayMessages}
                  onNavigateToMessage={navigateToMessage}
                />
                <button
                  onClick={handleExportPdf}
                  className="text-muted-fg hover:text-fg transition-colors print:hidden"
                  title="Export session as PDF"
                >
                  <span className="material-symbols-outlined text-xl">picture_as_pdf</span>
                </button>
              </div>
            </div>
            <h1 className="text-xl font-headline font-medium tracking-tight text-fg">{title}</h1>
            <p className="text-muted-fg text-xs">
              {formatDate(session.timestamp)} &middot; {projectName(session.dir)} &middot;{' '}
              {displayMessages.length} message{displayMessages.length !== 1 ? 's' : ''}
              {formatDuration(displayMessages) && <> &middot; {formatDuration(displayMessages)}</>}
            </p>
          </div>
        </section>

        {/* Conversation Flow */}
        <section className="flex-1 bg-bg p-8">
          <div className="max-w-3xl mx-auto space-y-4 pb-32 print:pb-0">
            {/* Pagination (top) */}
            {totalPages > 1 && (
              <Pagination
                page={page}
                totalPages={totalPages}
                onPageChange={setPage}
                onJumpToLatest={() => {
                  setPage(totalPages - 1);
                  scrollToEnd();
                }}
              />
            )}

            {/* Data quality warnings */}
            {missingToolResultCount > 0 && (
              <div className="rounded-lg border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 text-xs text-amber-600 dark:text-amber-400">
                {missingToolResultCount} tool output{missingToolResultCount === 1 ? '' : 's'}{' '}
                missing
              </div>
            )}
            {session.skippedLines != null && session.skippedLines > 0 && (
              <div className="rounded-lg border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 text-xs text-amber-600 dark:text-amber-400">
                {session.skippedLines} malformed line{session.skippedLines === 1 ? '' : 's'} skipped
                during parsing
              </div>
            )}
            {streamError && (
              <div className="rounded-lg border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 text-xs text-amber-600 dark:text-amber-400">
                Stream error: {streamError}
              </div>
            )}

            {/* Messages */}
            <div className="space-y-6">
              {visibleMessages.map((msg, index) => (
                <div
                  key={msg.uuid}
                  data-row-index={index}
                  data-message-uuid={msg.uuid}
                  className={`rounded-lg transition-colors duration-700 ${selectedIndex === index && !printing ? 'ring-2 ring-primary' : ''} ${highlightUuid === msg.uuid ? 'ring-2 ring-primary bg-primary/5' : ''}`}
                >
                  <MessageBubble
                    message={msg}
                    toolResults={toolResults}
                    agentGroups={agentGroups}
                    agentGroupFirstIds={agentGroupFirstIds}
                    isLastMessage={index === visibleMessages.length - 1}
                  />
                </div>
              ))}
              {activityState === 'working' && <WorkingIndicator />}
              <div ref={messagesEndRef} />
            </div>

            {/* Pagination (bottom) */}
            {totalPages > 1 && (
              <Pagination
                page={page}
                totalPages={totalPages}
                onPageChange={setPage}
                onJumpToLatest={() => {
                  setPage(totalPages - 1);
                  scrollToEnd();
                }}
              />
            )}
          </div>
        </section>

        {/* Auto-follow toggle */}
        <FollowToggle
          enabled={followMode}
          onToggle={() => {
            setFollowMode((prev: boolean) => {
              if (!prev) {
                scrollToEnd();
              }
              return !prev;
            });
          }}
        />
      </div>

      {/* Right Panel: Context & Metadata */}
      <SessionSidebar
        filePath={session.filePath}
        project={session.dir}
        model={session.model}
        timestamp={session.timestamp}
        sessionId={session.id}
        insights={insights}
        toolResults={toolResults}
        onNavigateToMessage={navigateToMessage}
      />
    </div>
  );
}
