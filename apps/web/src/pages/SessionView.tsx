import { useCallback, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import useSWR from 'swr';
import { ActivityBadge } from '../components/ActivityBadge';
import { MessageBubble } from '../components/MessageBubble';
import { CopyableText } from '../components/CopyableText';
import { Pagination } from '../components/SessionControls';
import { WorkingIndicator } from '../components/WorkingIndicator';
import { useKeyboardNavigation } from '../hooks/useKeyboardNavigation';
import { useSettings } from '../contexts/useSettings';
import { ApiError, fetcher } from '../api';
import { useSessionData } from '../hooks/useSessionData';
import { usePrintMode } from '../hooks/usePrintMode';
import { useMessagePagination } from '../hooks/useMessagePagination';
import { ConversationSearch } from '../components/ConversationSearch';
import { SessionSidebar } from '../components/SessionSidebar';
import type { ContentBlock, SubagentDetail, UsageTotals } from '../types';
import { Footer } from '../components/Footer';
import { TokenBreakdownPopover } from '../components/TokenBreakdownPopover';
import { formatDate, formatTokenCount, formatCost, formatDuration } from '../utils';

function InlineMetrics({ usage }: { usage: UsageTotals }) {
  const totalTokens =
    usage.inputTokens +
    usage.outputTokens +
    usage.cacheCreationInputTokens +
    usage.cacheReadInputTokens;

  if (totalTokens === 0) return null;

  return (
    <div className="flex gap-6 border-l border-border pl-6 h-fit">
      <TokenBreakdownPopover usage={usage}>
        <div className="flex flex-col">
          <span className="font-headline text-[10px] text-muted-fg uppercase tracking-tighter">
            Tokens
          </span>
          <span className="font-headline text-xl font-medium text-fg">
            {formatTokenCount(totalTokens)}
          </span>
        </div>
      </TokenBreakdownPopover>
      {usage.costUSD > 0 && (
        <div className="flex flex-col">
          <span className="font-headline text-[10px] text-muted-fg uppercase tracking-tighter">
            Cost
          </span>
          <span className="font-headline text-xl font-medium text-fg">
            {formatCost(usage.costUSD)}
          </span>
        </div>
      )}
    </div>
  );
}

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

  // Fetch subagent conversation from API when drilling in
  const { data: subagentData, isLoading: subagentLoading } = useSWR<SubagentDetail>(
    focusedAgentId && id ? `/api/sessions/${id}/subagents/${focusedAgentId}` : null,
    fetcher,
  );

  const subagentToolResults = useMemo(() => {
    if (!subagentData) return new Map<string, ContentBlock>();
    const map = new Map<string, ContentBlock>();
    for (const msg of subagentData.messages) {
      if (msg.type !== 'user' || !msg.message) continue;
      const content = msg.message.content;
      if (!Array.isArray(content)) continue;
      for (const block of content) {
        if (block.type === 'tool_result' && block.tool_use_id) {
          map.set(block.tool_use_id, block);
        }
      }
    }
    return map;
  }, [subagentData]);

  const subagentDisplayMessages = useMemo(() => {
    if (!subagentData) return [];
    return subagentData.messages.filter((m) => m.type !== 'file-history-snapshot');
  }, [subagentData]);

  const activeMessages = focusedAgentId ? subagentDisplayMessages : displayMessages;
  const activeToolResults = focusedAgentId ? subagentToolResults : toolResults;

  const focusedAgentPrompt = useMemo(() => {
    if (!focusedAgentId || !insights) return '';
    const agent = insights.subagents.find((a) => a.agentId === focusedAgentId);
    return agent?.prompt ?? 'Agent';
  }, [focusedAgentId, insights]);

  const handleFocusAgent = useCallback((agentId: string) => {
    setFocusedAgentId(agentId);
  }, []);

  const handleExitAgent = useCallback(() => {
    setFocusedAgentId(null);
  }, []);

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
      <div className="mx-auto max-w-4xl p-4 sm:p-8">
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
      <div className="mx-auto max-w-4xl p-4 sm:p-8">
        <p className="text-muted-fg">Loading session...</p>
      </div>
    );
  }

  const title = liveCustomTitle || session.customTitle || session.slug || session.id;
  const activityState = liveActivityState ?? session.activityState;

  return (
    <div className="flex flex-col lg:flex-row h-full">
      {/* Content Canvas */}
      <div
        className="flex-1 flex flex-col border-r border-border overflow-y-auto overflow-x-hidden"
        ref={containerRef}
        onScroll={handleScroll}
      >
        {/* Sticky header group: session header + optional subagent breadcrumb */}
        <div className="sticky top-0 z-10">
          {/* Session Header */}
          <section className="px-4 py-3 sm:px-8 sm:py-4 border-b border-border bg-[var(--color-card)]">
            <div className="max-w-4xl mx-auto space-y-1 sm:space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-4">
                <div className="flex items-center gap-2">
                  <CopyableText
                    text={session.id}
                    className="font-headline text-[10px] uppercase tracking-widest px-2 py-0.5 bg-tertiary-container text-tertiary-container-fg rounded cursor-pointer"
                  >
                    ID: {session.id.slice(0, 8).toUpperCase()}
                  </CopyableText>
                  <ActivityBadge state={activityState} />
                </div>
                <div className="flex items-center gap-2 sm:gap-4">
                  {liveUsage && <InlineMetrics usage={liveUsage} />}
                  <ConversationSearch
                    messages={activeMessages}
                    onNavigateToMessage={navigateToMessage}
                  />
                  <button
                    onClick={handleExportPdf}
                    className="text-muted-fg hover:text-fg transition-colors print:hidden"
                    title="Export session as PDF"
                  >
                    <span className="material-symbols-outlined text-xl">picture_as_pdf</span>
                  </button>
                  <button
                    onClick={() => setSidebarOpen((v) => !v)}
                    className="lg:hidden text-muted-fg hover:text-fg transition-colors print:hidden"
                    title="Toggle sidebar"
                  >
                    <span className="material-symbols-outlined text-xl">info</span>
                  </button>
                </div>
              </div>
              <h1 className="text-base sm:text-xl font-headline font-medium tracking-tight text-fg font-mono truncate">
                {title}
              </h1>
              <p className="text-muted-fg text-xs truncate">
                <Link
                  to={`/?dir=${encodeURIComponent(session.dir)}`}
                  className="hover:text-primary font-mono transition-colors"
                  title={session.dir}
                >
                  {session.dir}
                </Link>{' '}
                &middot; {formatDate(session.timestamp)} &middot; {displayMessages.length} msg
                {displayMessages.length !== 1 ? 's' : ''}
                {formatDuration(displayMessages) && (
                  <> &middot; {formatDuration(displayMessages)}</>
                )}
              </p>
            </div>
          </section>

          {/* Subagent breadcrumb */}
          {focusedAgentId && (
            <div className="border-b border-info/25 bg-[var(--color-bg)] px-4 sm:px-8">
              <div className="max-w-4xl mx-auto flex items-center gap-2 py-2">
                <button
                  onClick={handleExitAgent}
                  className="flex items-center gap-1 text-xs font-medium text-info hover:text-fg transition-colors shrink-0"
                >
                  <span className="material-symbols-outlined text-sm">arrow_back</span>
                  Back to session
                </button>
                <span className="text-muted-fg text-xs">/</span>
                <span className="flex items-center gap-1.5 text-xs text-info min-w-0">
                  <span className="material-symbols-outlined text-xs shrink-0">smart_toy</span>
                  {subagentData?.agentType && (
                    <span className="shrink-0 rounded bg-info/15 px-1.5 py-0.5 text-[10px] font-headline uppercase tracking-wide">
                      {subagentData.agentType}
                    </span>
                  )}
                  <span className="font-mono truncate">
                    {subagentData?.description || focusedAgentPrompt.slice(0, 80)}
                  </span>
                </span>
                <span className="ml-auto text-[10px] text-muted-fg font-mono shrink-0">
                  {subagentLoading
                    ? 'Loading...'
                    : `${subagentDisplayMessages.length} msg${subagentDisplayMessages.length !== 1 ? 's' : ''}`}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Conversation Flow */}
        <section className="flex-1 bg-bg p-4 sm:p-8">
          <div className="max-w-4xl mx-auto space-y-4 pb-32 print:pb-0">
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
                    toolResults={activeToolResults}
                    agentGroups={agentGroups}
                    agentGroupFirstIds={agentGroupFirstIds}
                    isLastMessage={index === visibleMessages.length - 1}
                    onFocusAgent={handleFocusAgent}
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
                follow={{
                  enabled: followMode,
                  onToggle: () => {
                    setFollowMode((prev: boolean) => {
                      if (!prev) {
                        scrollToEnd();
                      }
                      return !prev;
                    });
                  },
                }}
              />
            )}
          </div>
        </section>
        <Footer />
      </div>

      {/* Right Panel: Context & Metadata — desktop always visible */}
      <div className="hidden lg:block">
        <SessionSidebar
          filePath={focusedAgentId ? undefined : session.filePath}
          project={session.dir}
          model={session.model}
          timestamp={session.timestamp}
          sessionId={session.id}
          insights={focusedAgentId ? (subagentData?.insights ?? null) : insights}
          toolResults={activeToolResults}
          onNavigateToMessage={navigateToMessage}
          onFocusAgent={focusedAgentId ? undefined : handleFocusAgent}
          focusedAgentId={focusedAgentId}
          subagentLoading={subagentLoading}
        />
      </div>

      {/* Mobile sidebar — slide-up panel with lip toggle */}
      <div
        className={`lg:hidden fixed inset-x-0 bottom-0 z-30 flex flex-col transition-transform duration-300 ease-in-out print:hidden ${
          sidebarOpen ? 'translate-y-0' : 'translate-y-[calc(100%-40px)]'
        }`}
        style={{ maxHeight: '80dvh' }}
      >
        <button
          onClick={() => setSidebarOpen((v) => !v)}
          className={`mx-auto flex items-center gap-1.5 rounded-t-lg border-t border-x border-border shadow-sm px-5 py-2 text-xs font-medium transition-colors ${
            sidebarOpen
              ? 'bg-surface-dim text-fg'
              : 'bg-surface-dim/70 backdrop-blur-sm text-muted-fg'
          }`}
        >
          <span
            className={`material-symbols-outlined text-sm transition-transform duration-300 ${
              sidebarOpen ? 'rotate-180' : ''
            }`}
          >
            expand_less
          </span>
          Details
        </button>
        <div className="flex-1 overflow-y-auto">
          <SessionSidebar
            filePath={focusedAgentId ? undefined : session.filePath}
            project={session.dir}
            model={session.model}
            timestamp={session.timestamp}
            sessionId={session.id}
            insights={focusedAgentId ? (subagentData?.insights ?? null) : insights}
            toolResults={activeToolResults}
            onNavigateToMessage={navigateToMessage}
            onFocusAgent={focusedAgentId ? undefined : handleFocusAgent}
            focusedAgentId={focusedAgentId}
            subagentLoading={subagentLoading}
          />
        </div>
      </div>
    </div>
  );
}
