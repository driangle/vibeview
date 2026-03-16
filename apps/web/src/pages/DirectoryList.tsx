import { useMemo } from "react";
import { Link } from "react-router-dom";
import useSWR from "swr";
import { fetcher } from "../api";
import type { PaginatedSessions, Session } from "../types";
import { formatTime, projectName } from "../utils";

interface DirectorySummary {
  project: string;
  sessionCount: number;
  lastActivity: string;
}

function summarizeDirectories(sessions: Session[]): DirectorySummary[] {
  const map = new Map<string, DirectorySummary>();

  for (const session of sessions) {
    const existing = map.get(session.project);
    if (existing) {
      existing.sessionCount++;
      if (session.timestamp > existing.lastActivity) {
        existing.lastActivity = session.timestamp;
      }
    } else {
      map.set(session.project, {
        project: session.project,
        sessionCount: 1,
        lastActivity: session.timestamp,
      });
    }
  }

  return [...map.values()].sort(
    (a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime()
  );
}

export function DirectoryList() {
  const { data: paginated, error, isLoading } = useSWR<PaginatedSessions>(
    "/api/sessions",
    fetcher,
    { refreshInterval: 5000 }
  );

  const sessions = paginated?.sessions;

  const directories = useMemo(
    () => (sessions ? summarizeDirectories(sessions) : []),
    [sessions]
  );

  if (error) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Directories</h1>
        <p className="mt-4 text-red-600 dark:text-red-400">
          Failed to load sessions. Is the server running?
        </p>
      </div>
    );
  }

  if (isLoading || !sessions) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Directories</h1>
        <p className="mt-4 text-gray-500 dark:text-gray-400">Loading directories...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Directories</h1>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {directories.length} director{directories.length !== 1 ? "ies" : "y"}
        </span>
      </div>

      {directories.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400">No directories found.</p>
      ) : (
        <ul className="divide-y divide-gray-100 dark:divide-gray-700 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          {directories.map((dir) => (
            <li key={dir.project}>
              <Link
                to={`/?dir=${encodeURIComponent(dir.project)}`}
                className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                    {projectName(dir.project)}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 truncate">
                    {dir.project}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-gray-500 dark:text-gray-400">
                  {dir.sessionCount} session{dir.sessionCount !== 1 ? "s" : ""}
                </span>
                <span className="shrink-0 text-xs text-gray-400 dark:text-gray-500">
                  {formatTime(dir.lastActivity)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
