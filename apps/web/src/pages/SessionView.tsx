import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ActivityBadge } from '../components/ActivityBadge';
import { MessageBubble } from '../components/MessageBubble';
import { CopyableText } from '../components/CopyableText';
import { Pagination, FollowToggle } from '../components/SessionControls';
import { WorkingIndicator } from '../components/WorkingIndicator';
import { useKeyboardNavigation } from '../hooks/useKeyboardNavigation';
import { useSettings } from '../contexts/SettingsContext';
import { useSessionData } from '../hooks/useSessionData';
import type { UsageTotals } from '../types';

function projectName(project: string): string {
  const parts = project.split('/').filter(Boolean);
  return parts[parts.length - 1] || project;
}

function formatDate(timestamp: string): string {
  return new Date(timestamp).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatTokenCount(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}k`;
  return count.toString();
}

function formatCost(usd: number): string {
  return `$${usd.toFixed(2)}`;
}

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

function SessionSidebar({
  filePath,
  project,
  model,
  timestamp,
  sessionId,
}: {
  filePath?: string;
  project: string;
  model: string;
  timestamp: string;
  sessionId: string;
}) {
  return (
    <aside className="w-full lg:w-80 shrink-0 bg-surface-dim p-6 overflow-y-auto">
      <div className="space-y-8">
        {/* Context Files */}
        {filePath && (
          <div>
            <h3 className="font-headline text-[11px] font-bold uppercase tracking-widest text-muted-fg mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">attach_file</span>
              Context File
            </h3>
            <div className="space-y-2">
              <div className="p-3 bg-card border border-border rounded-lg flex items-center gap-3 hover:bg-bg transition-colors cursor-pointer group">
                <span className="material-symbols-outlined text-primary group-hover:scale-110 transition-transform">
                  description
                </span>
                <div className="flex flex-col overflow-hidden">
                  <span className="text-xs font-medium text-fg truncate">
                    {filePath.split('/').pop()}
                  </span>
                  <span className="text-[10px] text-muted-fg font-mono">{filePath}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Metadata */}
        <div className="pt-4 border-t border-border">
          <h3 className="font-headline text-[11px] font-bold uppercase tracking-widest text-muted-fg mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">info</span>
            Metadata
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-[11px] font-headline text-muted-fg uppercase">Project</span>
              <Link
                to={`/?dir=${encodeURIComponent(project)}`}
                className="text-xs font-medium text-fg hover:text-primary transition-colors"
              >
                {projectName(project)}
              </Link>
            </div>
            {model && (
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-headline text-muted-fg uppercase">Model</span>
                <span className="text-xs font-medium px-1.5 py-0.5 bg-muted rounded font-mono">
                  {model}
                </span>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="text-[11px] font-headline text-muted-fg uppercase">Started</span>
              <span className="text-xs font-medium text-fg">{formatDate(timestamp)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[11px] font-headline text-muted-fg uppercase">Session</span>
              <CopyableText
                text={sessionId}
                className="text-xs font-medium text-fg font-mono max-w-[140px] truncate"
              />
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}

export function SessionView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { settings, isLoaded } = useSettings();
  const [userPage, setUserPage] = useState<number | null>(null);
  const [followMode, setFollowMode] = useState(false);

  const followInitialized = useRef(false);
  useEffect(() => {
    if (isLoaded && !followInitialized.current) {
      followInitialized.current = true;
      setFollowMode(settings.autoFollow);
    }
  }, [isLoaded, settings.autoFollow]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const {
    session,
    error,
    isLoading,
    streamedMessages,
    connectionStatus,
    toolResults,
    liveUsage,
    liveCustomTitle,
    liveActivityState,
    displayMessages,
    agentGroups,
    agentGroupFirstIds,
  } = useSessionData(id);

  const totalPages = Math.max(1, Math.ceil(displayMessages.length / settings.messagesPerPage));
  const page = followMode ? totalPages - 1 : Math.min(userPage ?? 0, totalPages - 1);

  const paginatedMessages = displayMessages.slice(
    page * settings.messagesPerPage,
    (page + 1) * settings.messagesPerPage,
  );

  const onBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  const setPage = useCallback(
    (p: number) => {
      setUserPage(p);
      if (p < totalPages - 1) {
        setFollowMode(false);
      }
    },
    [totalPages],
  );

  const onPrevPage = useCallback(() => {
    if (page > 0) setPage(page - 1);
  }, [page, setPage]);

  const onNextPage = useCallback(() => {
    if (page < totalPages - 1) setPage(page + 1);
  }, [page, totalPages, setPage]);

  const { selectedIndex } = useKeyboardNavigation({
    itemCount: paginatedMessages.length,
    onBack,
    onPrevPage: totalPages > 1 ? onPrevPage : undefined,
    onNextPage: totalPages > 1 ? onNextPage : undefined,
    enabled: !isLoading && paginatedMessages.length > 0,
  });

  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
    if (atBottom && !followMode) {
      setFollowMode(true);
    } else if (!atBottom && followMode) {
      setFollowMode(false);
    }
  }, [followMode]);

  useEffect(() => {
    if (followMode && streamedMessages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [streamedMessages.length, followMode]);

  if (error) {
    return (
      <div className="mx-auto max-w-4xl p-8">
        <p className="text-destructive">Failed to load session.</p>
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
        <section className="p-8 border-b border-border bg-card">
          <div className="max-w-3xl mx-auto flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="font-headline text-[10px] uppercase tracking-widest px-2 py-0.5 bg-tertiary-container text-tertiary-container-fg rounded">
                  ID: {session.id.slice(0, 8).toUpperCase()}
                </span>
                <ActivityBadge state={activityState} />
                {connectionStatus !== 'disconnected' && (
                  <span className="flex items-center gap-1.5 font-headline text-[10px] uppercase tracking-widest px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-primary rounded">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    {connectionStatus === 'connected' ? 'LIVE' : 'CONNECTING'}
                  </span>
                )}
              </div>
              <h1 className="text-2xl md:text-3xl font-headline font-medium tracking-tight text-fg">
                {title}
              </h1>
              <p className="text-muted-fg mt-1 text-sm italic">
                {projectName(session.project)} &middot; {displayMessages.length} message
                {displayMessages.length !== 1 ? 's' : ''}
              </p>
            </div>
            {liveUsage && <InlineMetrics usage={liveUsage} />}
          </div>
        </section>

        {/* Conversation Flow */}
        <section className="flex-1 bg-bg p-8">
          <div className="max-w-3xl mx-auto space-y-4 pb-32">
            {/* Pagination (top) */}
            {totalPages > 1 && (
              <Pagination
                page={page}
                totalPages={totalPages}
                onPageChange={setPage}
                onJumpToLatest={() => {
                  setPage(totalPages - 1);
                  messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
                }}
              />
            )}

            {/* Messages */}
            <div className="space-y-6">
              {paginatedMessages.map((msg, index) => (
                <div
                  key={msg.uuid}
                  data-row-index={index}
                  className={`rounded-lg transition-colors ${selectedIndex === index ? 'ring-2 ring-primary' : ''}`}
                >
                  <MessageBubble
                    message={msg}
                    toolResults={toolResults}
                    agentGroups={agentGroups}
                    agentGroupFirstIds={agentGroupFirstIds}
                    isLastMessage={index === paginatedMessages.length - 1}
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
                  messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
                }}
              />
            )}
          </div>
        </section>

        {/* Auto-follow toggle */}
        <FollowToggle
          enabled={followMode}
          onToggle={() => {
            setFollowMode((prev) => {
              if (!prev) {
                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
              }
              return !prev;
            });
          }}
        />
      </div>

      {/* Right Panel: Context & Metadata */}
      <SessionSidebar
        filePath={session.filePath}
        project={session.project}
        model={session.model}
        timestamp={session.timestamp}
        sessionId={session.id}
      />
    </div>
  );
}
