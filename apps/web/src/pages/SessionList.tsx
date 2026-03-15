import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import useSWR from "swr";
import { fetcher } from "../api";
import { SessionRow } from "../components/SessionRow";
import { SortHeader } from "../components/SortHeader";
import type { SortColumn, SortDirection } from "../components/SortHeader";
import type { Session } from "../types";
import { projectName } from "../utils";

function useDebounced<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

function buildSessionsUrl(project: string, q: string): string {
  const params = new URLSearchParams();
  if (project) params.set("project", project);
  if (q) params.set("q", q);
  const qs = params.toString();
  return qs ? `/api/sessions?${qs}` : "/api/sessions";
}

function getSortValue(session: Session, column: SortColumn): string | number {
  switch (column) {
    case "date":
      return new Date(session.timestamp).getTime();
    case "name":
      return (session.customTitle || session.slug || session.id).toLowerCase();
    case "directory":
      return session.project.toLowerCase();
    case "messages":
      return session.messageCount;
    case "tokens":
      return session.usage.inputTokens + session.usage.outputTokens;
    case "cost":
      return session.usage.costUSD;
  }
}

export function SessionList() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounced(search, 300);
  const [searchParams, setSearchParams] = useSearchParams();
  const dirFilter = searchParams.get("dir") || "";

  const [sortColumn, setSortColumn] = useState<SortColumn>("date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

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

  const sortedSessions = useMemo(() => {
    if (!sessions) return [];
    const sorted = [...sessions].sort((a, b) => {
      const aVal = getSortValue(a, sortColumn);
      const bVal = getSortValue(b, sortColumn);
      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [sessions, sortColumn, sortDirection]);

  function toggleSort(column: SortColumn) {
    if (sortColumn === column) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(column);
      setSortDirection(column === "date" ? "desc" : "asc");
    }
  }

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
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <SortHeader label="Date" column="date" sortColumn={sortColumn} sortDirection={sortDirection} onToggle={toggleSort} />
                <SortHeader label="Session" column="name" sortColumn={sortColumn} sortDirection={sortDirection} onToggle={toggleSort} />
                <SortHeader label="Directory" column="directory" sortColumn={sortColumn} sortDirection={sortDirection} onToggle={toggleSort} />
                <SortHeader label="Messages" column="messages" sortColumn={sortColumn} sortDirection={sortDirection} onToggle={toggleSort} />
                <SortHeader label="Tokens" column="tokens" sortColumn={sortColumn} sortDirection={sortDirection} onToggle={toggleSort} />
                <SortHeader label="Cost" column="cost" sortColumn={sortColumn} sortDirection={sortDirection} onToggle={toggleSort} />
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Model
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedSessions.map((session) => (
                <SessionRow
                  key={session.id}
                  session={session}
                  onDirectoryClick={setDirFilter}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
