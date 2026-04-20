import { Link } from 'react-router-dom';
import { ActivityBadge } from './ActivityBadge';
import { ConversationSearch } from './ConversationSearch';
import { CopyableText } from './CopyableText';
import { TokenBreakdownPopover } from './TokenBreakdownPopover';
import { formatDate, formatTokenCount, formatCost, formatDuration } from '../utils';
import type { ActivityState, MessageResponse, SubagentDetail, UsageTotals } from '../types';

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

interface SessionViewHeaderProps {
  sessionId: string;
  title: string;
  dir: string;
  timestamp: string;
  activityState: ActivityState | undefined;
  liveUsage: UsageTotals | null;
  displayMessages: MessageResponse[];
  activeMessages: MessageResponse[];
  navigateToMessage: (uuid: string) => void;
  onExportPdf: () => void;
  onToggleSidebar: () => void;
  focusedAgentId: string | null;
  onExitAgent: () => void;
  subagentData: SubagentDetail | undefined;
  subagentLoading: boolean;
  subagentDisplayMessages: MessageResponse[];
  focusedAgentPrompt: string;
}

export function SessionViewHeader({
  sessionId,
  title,
  dir,
  timestamp,
  activityState,
  liveUsage,
  displayMessages,
  activeMessages,
  navigateToMessage,
  onExportPdf,
  onToggleSidebar,
  focusedAgentId,
  onExitAgent,
  subagentData,
  subagentLoading,
  subagentDisplayMessages,
  focusedAgentPrompt,
}: SessionViewHeaderProps) {
  return (
    <div className="sticky top-0 z-10">
      {/* Session Header */}
      <section className="px-4 py-3 sm:px-8 sm:py-4 border-b border-border bg-[var(--color-card)]">
        <div className="max-w-4xl mx-auto space-y-1 sm:space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-4">
            <div className="flex items-center gap-2">
              <CopyableText
                text={sessionId}
                className="font-headline text-[10px] uppercase tracking-widest px-2 py-0.5 bg-tertiary-container text-tertiary-container-fg rounded cursor-pointer"
              >
                ID: {sessionId.slice(0, 8).toUpperCase()}
              </CopyableText>
              <ActivityBadge state={activityState} showIdle />
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              {liveUsage && <InlineMetrics usage={liveUsage} />}
              <ConversationSearch
                messages={activeMessages}
                onNavigateToMessage={navigateToMessage}
              />
              <button
                onClick={onExportPdf}
                className="text-muted-fg hover:text-fg transition-colors print:hidden"
                title="Export session as PDF"
              >
                <span className="material-symbols-outlined text-xl">picture_as_pdf</span>
              </button>
              <button
                onClick={onToggleSidebar}
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
              to={`/?dir=${encodeURIComponent(dir)}`}
              className="hover:text-primary font-mono transition-colors"
              title={dir}
            >
              {dir}
            </Link>{' '}
            &middot; {formatDate(timestamp)} &middot; {displayMessages.length} msg
            {displayMessages.length !== 1 ? 's' : ''}
            {formatDuration(displayMessages) && <> &middot; {formatDuration(displayMessages)}</>}
          </p>
        </div>
      </section>

      {/* Subagent breadcrumb */}
      {focusedAgentId && (
        <div className="border-b border-info/25 bg-[var(--color-bg)] px-4 sm:px-8">
          <div className="max-w-4xl mx-auto flex items-center gap-2 py-2">
            <button
              onClick={onExitAgent}
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
  );
}
