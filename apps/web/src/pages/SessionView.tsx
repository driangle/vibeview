import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "react-router-dom";
import { MessageBubble } from "../components/MessageBubble";
import { CostDisplay } from "../components/CostDisplay";
import { LiveIndicator, Pagination, FollowToggle } from "../components/SessionControls";
import { useSessionData } from "../hooks/useSessionData";

const MESSAGES_PER_PAGE = 50;

function projectName(project: string): string {
  const parts = project.split("/").filter(Boolean);
  return parts[parts.length - 1] || project;
}

function formatDate(timestamp: string): string {
  return new Date(timestamp).toLocaleString();
}

export function SessionView() {
  const { id } = useParams<{ id: string }>();
  const [userPage, setUserPage] = useState<number | null>(null);
  const [followMode, setFollowMode] = useState(true);
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
    displayMessages,
  } = useSessionData(id);

  const totalPages = Math.max(
    1,
    Math.ceil(displayMessages.length / MESSAGES_PER_PAGE),
  );

  // In follow mode, always show the last page; otherwise use user-selected page.
  const page = followMode ? totalPages - 1 : Math.min(userPage ?? 0, totalPages - 1);

  const paginatedMessages = displayMessages.slice(
    page * MESSAGES_PER_PAGE,
    (page + 1) * MESSAGES_PER_PAGE,
  );

  const setPage = useCallback((p: number) => {
    setUserPage(p);
    if (p < totalPages - 1) {
      setFollowMode(false);
    }
  }, [totalPages]);

  // Auto-disable follow when user scrolls up, re-enable at bottom.
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

  // Auto-scroll when new messages arrive and follow mode is on.
  useEffect(() => {
    if (followMode && streamedMessages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [streamedMessages.length, followMode]);

  if (error) {
    return (
      <div className="mx-auto max-w-4xl p-8">
        <p className="text-red-600">Failed to load session.</p>
      </div>
    );
  }

  if (isLoading || !session) {
    return (
      <div className="mx-auto max-w-4xl p-8">
        <p className="text-gray-500">Loading session…</p>
      </div>
    );
  }

  return (
    <div
      className="mx-auto max-w-4xl p-8"
      ref={containerRef}
      onScroll={handleScroll}
    >
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-gray-900">
            {session.customTitle || session.slug || session.id}
          </h1>
          <LiveIndicator status={connectionStatus} />
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-gray-500">
          <span className="select-all font-mono text-xs">{session.id}</span>
          <span>{projectName(session.project)}</span>
          {session.model && (
            <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">
              {session.model}
            </span>
          )}
          <span>
            {displayMessages.length} message
            {displayMessages.length !== 1 ? "s" : ""}
          </span>
          <span>{formatDate(session.timestamp)}</span>
        </div>
        {session.filePath && (
          <div className="mt-1 select-all truncate font-mono text-xs text-gray-400">
            {session.filePath}
          </div>
        )}
        {liveUsage && <CostDisplay usage={liveUsage} />}
      </div>

      {/* Pagination (top) */}
      {totalPages > 1 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      )}

      {/* Messages */}
      <div className="space-y-4 py-4">
        {paginatedMessages.map((msg) => (
          <MessageBubble
            key={msg.uuid}
            message={msg}
            toolResults={toolResults}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Pagination (bottom) */}
      {totalPages > 1 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      )}

      {/* Auto-follow toggle */}
      <FollowToggle
        enabled={followMode}
        onToggle={() => {
          setFollowMode((prev) => {
            if (!prev) {
              messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
            }
            return !prev;
          });
        }}
      />
    </div>
  );
}
