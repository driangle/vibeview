import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import useSWR from "swr";
import { fetcher } from "../api";
import type { Session } from "../types";

const RECENT_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

function isRecent(timestamp: string): boolean {
  return Date.now() - new Date(timestamp).getTime() < RECENT_THRESHOLD_MS;
}

function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function projectName(project: string): string {
  // Show the last path segment as the project name
  const parts = project.split("/").filter(Boolean);
  return parts[parts.length - 1] || project;
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

export function SessionList() {
  const [search, setSearch] = useState("");
  const [searchParams, setSearchParams] = useSearchParams();
  const dirFilter = searchParams.get("dir") || "";

  const { data: sessions, error, isLoading } = useSWR<Session[]>(
    "/api/sessions",
    fetcher,
    { refreshInterval: 5000 }
  );

  const uniqueProjects = useMemo(() => {
    if (!sessions) return [];
    const projects = [...new Set(sessions.map((s) => s.project))];
    return projects.sort();
  }, [sessions]);

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

  const dirFiltered = dirFilter
    ? sessions.filter((s) => s.project === dirFilter)
    : sessions;

  const filtered = search
    ? dirFiltered.filter(
        (s) =>
          s.project.toLowerCase().includes(search.toLowerCase()) ||
          s.slug?.toLowerCase().includes(search.toLowerCase()) ||
          s.customTitle?.toLowerCase().includes(search.toLowerCase())
      )
    : dirFiltered;

  const grouped = groupByProject(filtered);

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

      {filtered.length === 0 ? (
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
