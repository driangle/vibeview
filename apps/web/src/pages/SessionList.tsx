import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import useSWR from "swr";
import { fetcher } from "../api";
import type { Session } from "../types";
import { formatTime, projectName } from "../utils";

function useDebounced<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

const RECENT_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

function isRecent(timestamp: string): boolean {
  return Date.now() - new Date(timestamp).getTime() < RECENT_THRESHOLD_MS;
}

function groupByProject(sessions: Session[]): Map<string, Session[]> {
  const groups = new Map<string, Session[]>();
  for (const session of sessions) {
    const key = session.project;
    const group = groups.get(key);
    if (group) {
      group.push(session);
    } else {
      groups.set(key, [session]);
    }
  }
  return groups;
}

function buildSessionsUrl(project: string, q: string): string {
  const params = new URLSearchParams();
  if (project) params.set("project", project);
  if (q) params.set("q", q);
  const qs = params.toString();
  return qs ? `/api/sessions?${qs}` : "/api/sessions";
}

export function SessionList() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounced(search, 300);
  const [searchParams, setSearchParams] = useSearchParams();
  const dirFilter = searchParams.get("dir") || "";

  const apiUrl = buildSessionsUrl(dirFilter, debouncedSearch);
  const { data: sessions, error, isLoading } = useSWR<Session[]>(
    apiUrl,
    fetcher,
    { refreshInterval: 5000 }
  );

  // Fetch all sessions (unfiltered) for the project dropdown.
  const { data: allSessions } = useSWR<Session[]>(
    "/api/sessions",
    fetcher,
    { refreshInterval: 5000 }
  );

  const uniqueProjects = useMemo(() => {
    if (!allSessions) return [];
    const projects = [...new Set(allSessions.map((s) => s.project))];
    return projects.sort();
  }, [allSessions]);

  function setDirFilter(dir: string) {
    setSearchParams((prev) => {
      if (dir) {
        prev.set("dir", dir);
      } else {
        prev.delete("dir");
      }
      return prev;
    });
  }

  if (error) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-gray-900">Sessions</h1>
        <p className="mt-4 text-red-600">
          Failed to load sessions. Is the server running?
        </p>
      </div>
    );
  }

  if (isLoading || !sessions) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-gray-900">Sessions</h1>
        <p className="mt-4 text-gray-500">Loading sessions...</p>
      </div>
    );
  }

  const grouped = groupByProject(sessions);

  return (
    <div className="mx-auto max-w-4xl p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Sessions</h1>
        <span className="text-sm text-gray-500">
          {sessions.length} session{sessions.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="mb-6 flex gap-3">
        <select
          value={dirFilter}
          onChange={(e) => setDirFilter(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
        >
          <option value="">All directories</option>
          {uniqueProjects.map((project) => (
            <option key={project} value={project}>
              {projectName(project)}
            </option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Filter by project or topic..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="min-w-0 flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
        />
      </div>

      {sessions.length === 0 ? (
        <p className="text-gray-500">
          {search ? "No sessions match your filter." : "No sessions found."}
        </p>
      ) : (
        <div className="space-y-8">
          {[...grouped.entries()].map(([project, projectSessions]) => (
            <section key={project}>
              <h2 className="mb-3 text-sm font-semibold text-gray-500 uppercase tracking-wide">
                {projectName(project)}
                <span className="ml-2 text-xs font-normal text-gray-400">
                  {project}
                </span>
              </h2>
              <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white">
                {projectSessions.map((session) => (
                  <li key={session.id}>
                    <Link
                      to={`/session/${session.id}`}
                      className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-gray-50"
                    >
                      {isRecent(session.timestamp) && (
                        <span
                          className="h-2 w-2 shrink-0 rounded-full bg-green-500"
                          title="Active recently"
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-gray-900">
                          {session.customTitle || session.slug || session.id}
                        </p>
                        <p className="mt-0.5 flex items-center gap-2 text-xs text-gray-500">
                          {session.model && (
                            <span className="rounded bg-gray-100 px-1.5 py-0.5">
                              {session.model}
                            </span>
                          )}
                          <span>
                            {session.messageCount} message{session.messageCount !== 1 ? "s" : ""}
                          </span>
                        </p>
                      </div>
                      <span className="shrink-0 text-xs text-gray-400">
                        {formatTime(session.timestamp)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
