import type { RefObject } from 'react';
import { MessageBubble } from './MessageBubble';
import { Pagination } from './SessionControls';
import { WorkingIndicator } from './WorkingIndicator';
import type { ActivityState, ContentBlock, MessageResponse } from '../types';

interface ConversationFlowProps {
  visibleMessages: MessageResponse[];
  toolResults: Map<string, ContentBlock>;
  agentGroups: Map<string, MessageResponse[]>;
  agentGroupFirstIds: Set<string>;
  onFocusAgent: (agentId: string) => void;
  activityState: ActivityState | undefined;
  selectedIndex: number;
  printing: boolean;
  highlightUuid: string | null;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onJumpToLatest: () => void;
  followMode: boolean;
  onToggleFollow: () => void;
  missingToolResultCount: number;
  skippedLines: number | undefined;
  streamError: string | null;
  messagesEndRef: RefObject<HTMLDivElement | null>;
}

export function ConversationFlow({
  visibleMessages,
  toolResults,
  agentGroups,
  agentGroupFirstIds,
  onFocusAgent,
  activityState,
  selectedIndex,
  printing,
  highlightUuid,
  page,
  totalPages,
  onPageChange,
  onJumpToLatest,
  followMode,
  onToggleFollow,
  missingToolResultCount,
  skippedLines,
  streamError,
  messagesEndRef,
}: ConversationFlowProps) {
  return (
    <section className="flex-1 bg-bg p-4 sm:p-8">
      <div className="max-w-4xl mx-auto space-y-4 pb-32 print:pb-0">
        {totalPages > 1 && (
          <Pagination
            page={page}
            totalPages={totalPages}
            onPageChange={onPageChange}
            onJumpToLatest={onJumpToLatest}
          />
        )}

        {missingToolResultCount > 0 && (
          <div className="rounded-lg border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 text-xs text-amber-600 dark:text-amber-400">
            {missingToolResultCount} tool output{missingToolResultCount === 1 ? '' : 's'} missing
          </div>
        )}
        {skippedLines != null && skippedLines > 0 && (
          <div className="rounded-lg border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 text-xs text-amber-600 dark:text-amber-400">
            {skippedLines} malformed line{skippedLines === 1 ? '' : 's'} skipped during parsing
          </div>
        )}
        {streamError && (
          <div className="rounded-lg border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 text-xs text-amber-600 dark:text-amber-400">
            Stream error: {streamError}
          </div>
        )}

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
                onFocusAgent={onFocusAgent}
              />
            </div>
          ))}
          {activityState === 'working' && <WorkingIndicator />}
          <div ref={messagesEndRef} />
        </div>

        {totalPages > 1 && (
          <Pagination
            page={page}
            totalPages={totalPages}
            onPageChange={onPageChange}
            onJumpToLatest={onJumpToLatest}
            follow={{
              enabled: followMode,
              onToggle: onToggleFollow,
            }}
          />
        )}
      </div>
    </section>
  );
}
