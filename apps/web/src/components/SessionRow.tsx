import { Link } from "react-router-dom";
import type { Session } from "../types";
import { formatTime, projectName } from "../utils";

const RECENT_THRESHOLD_MS = 5 * 60 * 1000;

function formatTokens(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}k`;
  return String(count);
}

function isRecent(timestamp: string): boolean {
  return Date.now() - new Date(timestamp).getTime() < RECENT_THRESHOLD_MS;
}

interface SessionRowProps {
  session: Session;
  onDirectoryClick: (dir: string) => void;
}

export function SessionRow({ session, onDirectoryClick }: SessionRowProps) {
  return (
    <tr className="border-t border-gray-100 transition-colors hover:bg-gray-50">
      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
        <span className="inline-flex items-center gap-2">
          {isRecent(session.timestamp) && (
            <span
              className="h-2 w-2 shrink-0 rounded-full bg-green-500"
              title="Active recently"
            />
          )}
          {formatTime(session.timestamp)}
        </span>
      </td>
      <td className="px-4 py-3 text-sm">
        <Link
          to={`/session/${session.id}`}
          className="font-medium text-gray-900 hover:text-blue-600"
        >
          {session.customTitle || session.slug || session.id}
        </Link>
      </td>
      <td className="px-4 py-3 text-xs">
        <button
          type="button"
          onClick={() => onDirectoryClick(session.project)}
          className="cursor-pointer text-gray-500 hover:text-blue-600 hover:underline"
        >
          {projectName(session.project)}
        </button>
      </td>
      <td className="px-4 py-3 text-xs text-gray-500 text-right">
        {session.messageCount}
      </td>
      <td className="px-4 py-3 text-xs text-gray-500 text-right whitespace-nowrap">
        {formatTokens(session.usage.inputTokens + session.usage.outputTokens)}
      </td>
      <td className="px-4 py-3 text-xs text-gray-500 text-right whitespace-nowrap">
        ${session.usage.costUSD.toFixed(2)}
      </td>
      <td className="px-4 py-3 text-xs">
        {session.model && (
          <span className="rounded bg-gray-100 px-1.5 py-0.5 text-gray-600">
            {session.model}
          </span>
        )}
      </td>
    </tr>
  );
}
