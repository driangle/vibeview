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
  isSelected?: boolean;
  rowIndex?: number;
}

export function SessionRow({ session, onDirectoryClick, isSelected, rowIndex }: SessionRowProps) {
  return (
    <tr
      data-row-index={rowIndex}
      className={`border-t border-gray-100 dark:border-gray-700 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50 ${isSelected ? "ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20" : ""}`}
    >
      <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
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
          className="font-medium text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400"
        >
          {session.customTitle || session.slug || session.id}
        </Link>
      </td>
      <td className="px-4 py-3 text-xs">
        <button
          type="button"
          onClick={() => onDirectoryClick(session.project)}
          className="cursor-pointer text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:underline"
        >
          {projectName(session.project)}
        </button>
      </td>
      <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 text-right">
        {session.messageCount}
      </td>
      <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 text-right whitespace-nowrap">
        {formatTokens(session.usage.inputTokens + session.usage.outputTokens)}
      </td>
      <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 text-right whitespace-nowrap">
        ${session.usage.costUSD.toFixed(2)}
      </td>
      <td className="px-4 py-3 text-xs">
        {session.model && (
          <span className="rounded bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 text-gray-600 dark:text-gray-400">
            {session.model}
          </span>
        )}
      </td>
    </tr>
  );
}
