import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import useSWR from "swr";
import { fetcher } from "../api";
import type {
  SessionDetail,
  ContentBlock,
  MessageResponse,
  UsageTotals,
} from "../types";
import { MessageBubble } from "../components/MessageBubble";
import { CostDisplay } from "../components/CostDisplay";
import { useSessionStream } from "../hooks/useSessionStream";

const MESSAGES_PER_PAGE = 50;

function projectName(project: string): string {
  const parts = project.split("/").filter(Boolean);
  return parts[parts.length - 1] || project;
}

function formatDate(timestamp: string): string {
  return new Date(timestamp).toLocaleString();
}

/** Build a map from tool_use ID → tool_result content block for pairing. */
function buildToolResultMap(
  messages: MessageResponse[],
): Map<string, ContentBlock> {
  const map = new Map<string, ContentBlock>();
  for (const msg of messages) {
    if (msg.type !== "user" || !msg.message) continue;
    const content = msg.message.content;
    if (!Array.isArray(content)) continue;
    for (const block of content) {
      if (block.type === "tool_result" && block.tool_use_id) {
        map.set(block.tool_use_id, block);
      }
    }
  }
  return map;
}

export function SessionView() {
  const { id } = useParams<{ id: string }>();
  const [page, setPage] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const wasAtBottom = useRef(true);

  const {
    data: session,
    error,
    isLoading,
  } = useSWR<SessionDetail>(id ? `/api/sessions/${id}` : null, fetcher);

  const { streamedMessages, connectionStatus, addInitialUUIDs } =
    useSessionStream(id);

  // Register initial message UUIDs so the SSE hook deduplicates.
  useEffect(() => {
    if (session) {
      addInitialUUIDs(session.messages.map((m) => m.uuid));
    }
  }, [session, addInitialUUIDs]);

  // Combine fetched + streamed messages.
  const allMessages = useMemo(() => {
    if (!session) return [];
    return [...session.messages, ...streamedMessages];
  }, [session, streamedMessages]);

  const toolResults = useMemo(
    () => buildToolResultMap(allMessages),
    [allMessages],
  );

  // Aggregate usage: session totals + any new streamed assistant messages.
  const liveUsage = useMemo<UsageTotals | null>(() => {
    if (!session) return null;
    const base = { ...session.usage };
    for (const msg of streamedMessages) {
      if (msg.type === "assistant" && msg.message?.usage) {
        const u = msg.message.usage;
        base.inputTokens += u.input_tokens;
        base.outputTokens += u.output_tokens;
        base.cacheCreationInputTokens += u.cache_creation_input_tokens;
        base.cacheReadInputTokens += u.cache_read_input_tokens;
        base.costUSD += u.costUSD ?? 0;
      }
    }
    return base;
  }, [session, streamedMessages]);

  // Filter out non-renderable messages for pagination.
  const displayMessages = useMemo(() => {
    return allMessages.filter((m) => m.type !== "file-history-snapshot");
  }, [allMessages]);

  const totalPages = Math.max(
    1,
    Math.ceil(displayMessages.length / MESSAGES_PER_PAGE),
  );
  const paginatedMessages = displayMessages.slice(
    page * MESSAGES_PER_PAGE,
    (page + 1) * MESSAGES_PER_PAGE,
  );

  // Track if user is scrolled to bottom.
  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    wasAtBottom.current =
      el.scrollHeight - el.scrollTop - el.clientHeight < 100;
  }, []);

  // Auto-scroll when new messages arrive and user was at bottom.
  useEffect(() => {
    if (wasAtBottom.current && streamedMessages.length > 0) {
      // Jump to last page if new messages push beyond current page.
      const newTotalPages = Math.max(
        1,
        Math.ceil(displayMessages.length / MESSAGES_PER_PAGE),
      );
      if (page < newTotalPages - 1) {
        setPage(newTotalPages - 1);
      }
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [streamedMessages.length, displayMessages.length, page]);

  if (error) {
    return (
      <div className="mx-auto max-w-4xl p-8">
        <Link to="/" className="text-sm text-blue-600 hover:underline">
          ← Back to sessions
        </Link>
        <p className="mt-4 text-red-600">Failed to load session.</p>
      </div>
    );
  }

  if (isLoading || !session) {
    return (
      <div className="mx-auto max-w-4xl p-8">
        <Link to="/" className="text-sm text-blue-600 hover:underline">
          ← Back to sessions
        </Link>
        <p className="mt-4 text-gray-500">Loading session…</p>
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
          <Link to="/" className="text-sm text-blue-600 hover:underline">
            ← Back to sessions
          </Link>
          <LiveIndicator status={connectionStatus} />
        </div>
        <h1 className="mt-2 text-xl font-bold text-gray-900">
          {session.slug || session.display || session.id}
        </h1>
        <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-gray-500">
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
    </div>
  );
}

function LiveIndicator({
  status,
}: {
  status: "connecting" | "connected" | "disconnected";
}) {
  if (status === "disconnected") return null;

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-2 py-0.5 text-xs text-green-700">
      <span
        className={`inline-block h-1.5 w-1.5 rounded-full ${
          status === "connected" ? "bg-green-500 animate-pulse" : "bg-yellow-400"
        }`}
      />
      {status === "connected" ? "Live" : "Connecting…"}
    </span>
  );
}

function Pagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  return (
    <div className="flex items-center justify-between py-3">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page === 0}
        className="rounded border border-gray-300 px-3 py-1 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Previous
      </button>
      <span className="text-sm text-gray-500">
        Page {page + 1} of {totalPages}
      </span>
      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages - 1}
        className="rounded border border-gray-300 px-3 py-1 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Next
      </button>
    </div>
  );
}
