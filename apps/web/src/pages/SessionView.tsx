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
import { FilesTouched } from '../components/FilesTouched';
import { FileViewer } from '../components/FileViewer';
import {
  SidebarSection,
  ToolUsageSummary,
  SkillsSummary,
  BashCommandsList,
  ErrorsSummary,
  SubagentsSummary,
  WorktreesSummary,
} from '../components/SessionInsights';
import type { FileOperation } from '../components/FileViewer';
import type { ContentBlock, MessageResponse, UsageTotals } from '../types';
import type { SubagentInfo } from '../lib/extractors';

function usePrintMode() {
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    const onBefore = () => setPrinting(true);
    const onAfter = () => setPrinting(false);
    window.addEventListener('beforeprint', onBefore);
    window.addEventListener('afterprint', onAfter);
    return () => {
      window.removeEventListener('beforeprint', onBefore);
      window.removeEventListener('afterprint', onAfter);
    };
  }, []);

  return printing;
}

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

function formatDuration(messages: MessageResponse[]): string | null {
  if (messages.length < 2) return null;
  let first = NaN;
  let last = NaN;
  for (let i = 0; i < messages.length; i++) {
    const t = new Date(messages[i].timestamp).getTime();
    if (Number.isFinite(t)) {
      first = t;
      break;
    }
  }
  for (let i = messages.length - 1; i >= 0; i--) {
    const t = new Date(messages[i].timestamp).getTime();
    if (Number.isFinite(t)) {
      last = t;
      break;
    }
  }
  const diffMs = last - first;
  if (!Number.isFinite(diffMs) || diffMs <= 0) return null;

  const seconds = Math.floor(diffMs / 1000);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${secs}s`;
  return `${secs}s`;
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
  messages,
  toolResults,
  subagents,
  onNavigateToMessage,
}: {
  filePath?: string;
  project: string;
  model: string;
  timestamp: string;
  sessionId: string;
  messages: MessageResponse[];
  toolResults: Map<string, ContentBlock>;
  subagents: SubagentInfo[];
  onNavigateToMessage: (uuid: string) => void;
}) {
  const [viewerFile, setViewerFile] = useState<{
    path: string;
    operations: FileOperation[];
  } | null>(null);

  const handleFileClick = useCallback((path: string, operations: FileOperation[]) => {
    setViewerFile({ path, operations });
  }, []);

  const handleCommandClick = useCallback((command: string, output: string | null) => {
    const content = output ? `$ ${command}\n\n${output}` : `$ ${command}`;
    setViewerFile({ path: 'Command', operations: [{ type: 'read', content, timestamp: '' }] });
  }, []);

  const handleCopyPath = useCallback(async (e: React.MouseEvent, path: string) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(path);
  }, []);

  return (
    <aside className="w-full lg:w-80 shrink-0 bg-surface-dim p-6 overflow-y-auto print:hidden lg:sticky lg:top-0 lg:self-start lg:max-h-[100vh]">
      <div className="space-y-8">
        {/* Raw Session File */}
        {filePath && (
          <SidebarSection id="raw-session-file" icon="attach_file" title="Raw Session File">
            <button
              onClick={() => handleFileClick(filePath, [])}
              className="w-full p-3 bg-card border border-border rounded-lg flex items-center gap-3 hover:bg-bg transition-colors cursor-pointer group text-left"
            >
              <span className="material-symbols-outlined text-primary group-hover:scale-110 transition-transform">
                description
              </span>
              <div className="flex flex-col overflow-hidden flex-1 min-w-0">
                <span className="text-xs font-medium text-fg truncate">
                  {filePath.split('/').pop()}
                </span>
                <span className="text-[10px] text-muted-fg font-mono truncate">{filePath}</span>
              </div>
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => handleCopyPath(e, filePath)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    e.stopPropagation();
                    navigator.clipboard.writeText(filePath);
                  }
                }}
                className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-muted-fg hover:text-fg transition-all shrink-0"
                title="Copy path"
              >
                <span className="material-symbols-outlined text-xs">content_copy</span>
              </span>
            </button>
          </SidebarSection>
        )}

        {/* Files Touched */}
        <FilesTouched
          messages={messages}
          toolResults={toolResults}
          onFileClick={handleFileClick}
          onNavigateToMessage={onNavigateToMessage}
        />

        {/* Tool Usage */}
        <ToolUsageSummary messages={messages} />

        {/* Skills */}
        <SkillsSummary messages={messages} onNavigateToMessage={onNavigateToMessage} />

        {/* Bash Commands */}
        <BashCommandsList
          messages={messages}
          toolResults={toolResults}
          onCommandClick={handleCommandClick}
          onNavigateToMessage={onNavigateToMessage}
        />

        {/* Worktrees */}
        <WorktreesSummary
          messages={messages}
          toolResults={toolResults}
          onNavigateToMessage={onNavigateToMessage}
        />

        {/* Subagents */}
        <SubagentsSummary subagents={subagents} onNavigateToMessage={onNavigateToMessage} />

        {/* Errors */}
        <ErrorsSummary
          messages={messages}
          toolResults={toolResults}
          onNavigateToMessage={onNavigateToMessage}
        />

        {/* Metadata */}
        <SidebarSection id="metadata" icon="info" title="Metadata">
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
        </SidebarSection>
      </div>

      {viewerFile && (
        <FileViewer
          filePath={viewerFile.path}
          operations={viewerFile.operations}
          onClose={() => setViewerFile(null)}
        />
      )}
    </aside>
  );
}

export function SessionView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { settings, isLoaded } = useSettings();
  const [userPage, setUserPage] = useState<number | null>(null);
  const [followMode, setFollowMode] = useState(false);
  const printing = usePrintMode();

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
    subagents,
    agentGroups,
    agentGroupFirstIds,
  } = useSessionData(id);

  const totalPages = Math.max(1, Math.ceil(displayMessages.length / settings.messagesPerPage));
  const page = followMode ? totalPages - 1 : Math.min(userPage ?? 0, totalPages - 1);

  const paginatedMessages = displayMessages.slice(
    page * settings.messagesPerPage,
    (page + 1) * settings.messagesPerPage,
  );

  // When printing, show all messages instead of paginated subset
  const visibleMessages = printing ? displayMessages : paginatedMessages;

  const [highlightUuid, setHighlightUuid] = useState<string | null>(null);
  const highlightTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);

  const navigateToMessage = useCallback(
    (uuid: string) => {
      const msgIndex = displayMessages.findIndex((m) => m.uuid === uuid);
      if (msgIndex === -1) return;
      const targetPage = Math.floor(msgIndex / settings.messagesPerPage);
      setFollowMode(false);
      setUserPage(targetPage);

      // Highlight and scroll after page renders
      setHighlightUuid(uuid);
      clearTimeout(highlightTimeout.current);
      highlightTimeout.current = setTimeout(() => setHighlightUuid(null), 2000);

      requestAnimationFrame(() => {
        const el = containerRef.current?.querySelector(`[data-message-uuid="${uuid}"]`);
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    },
    [displayMessages, settings.messagesPerPage],
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

  const handleExportPdf = useCallback(() => {
    window.print();
  }, []);

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
        <section className="px-8 py-4 border-b border-border bg-card">
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
                {connectionStatus !== 'disconnected' && (
                  <span className="flex items-center gap-1.5 font-headline text-[10px] uppercase tracking-widest px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-primary rounded print:hidden">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    {connectionStatus === 'connected' ? 'LIVE' : 'CONNECTING'}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4">
                {liveUsage && <InlineMetrics usage={liveUsage} />}
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
              {formatDate(session.timestamp)} &middot; {projectName(session.project)} &middot;{' '}
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
                  messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
                }}
              />
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
        messages={displayMessages}
        toolResults={toolResults}
        subagents={subagents}
        onNavigateToMessage={navigateToMessage}
      />
    </div>
  );
}
