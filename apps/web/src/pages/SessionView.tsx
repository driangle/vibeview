import { useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import useSWR from "swr";
import { fetcher } from "../api";
import type { SessionDetail, ContentBlock } from "../types";
import { MessageBubble } from "../components/MessageBubble";

const MESSAGES_PER_PAGE = 50;

function projectName(project: string): string {
  const parts = project.split("/").filter(Boolean);
  return parts[parts.length - 1] || project;
}

function formatDate(timestamp: string): string {
  return new Date(timestamp).toLocaleString();
}

/** Build a map from tool_use ID → tool_result content block for pairing. */
function buildToolResultMap(session: SessionDetail): Map<string, ContentBlock> {
  const map = new Map<string, ContentBlock>();
  for (const msg of session.messages) {
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

  const { data: session, error, isLoading } = useSWR<SessionDetail>(
    id ? `/api/sessions/${id}` : null,
    fetcher,
  );

  const toolResults = useMemo(
    () => (session ? buildToolResultMap(session) : new Map<string, ContentBlock>()),
    [session],
  );

  // Filter out non-renderable messages for pagination
  const displayMessages = useMemo(() => {
    if (!session) return [];
    return session.messages.filter(
      (m) => m.type !== "file-history-snapshot",
    );
  }, [session]);

  const totalPages = Math.max(1, Math.ceil(displayMessages.length / MESSAGES_PER_PAGE));
  const paginatedMessages = displayMessages.slice(
    page * MESSAGES_PER_PAGE,
    (page + 1) * MESSAGES_PER_PAGE,
  );

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
    <div className="mx-auto max-w-4xl p-8">
      {/* Header */}
      <div className="mb-6">
        <Link to="/" className="text-sm text-blue-600 hover:underline">
          ← Back to sessions
        </Link>
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
          <span>{session.messageCount} messages</span>
          <span>{formatDate(session.timestamp)}</span>
        </div>
      </div>

      {/* Pagination (top) */}
      {totalPages > 1 && (
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
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
      </div>

      {/* Pagination (bottom) */}
      {totalPages > 1 && (
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      )}
    </div>
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
