import { useCallback, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import useSWR from "swr";
import { fetcher } from "../api";
import { DateRangeFilter } from "../components/DateRangeFilter";
import { Pagination } from "../components/Pagination";
import { SessionTable } from "../components/SessionTable";
import type { SortColumn, SortDirection } from "../components/SortHeader";
import { useDebounced } from "../hooks/useDebounced";
import { useKeyboardNavigation } from "../hooks/useKeyboardNavigation";
import type { PaginatedSessions, Session } from "../types";
import { projectName } from "../utils";

const PAGE_SIZE = 100;

function buildSessionsUrl(
  project: string,
  q: string,
  from: string,
  to: string,
  page?: number,
): string {
  const params = new URLSearchParams();
  if (project) params.set("project", project);
  if (q) params.set("q", q);
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  if (page !== undefined) {
    params.set("limit", String(PAGE_SIZE));
    params.set("offset", String((page - 1) * PAGE_SIZE));
  }
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
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounced(search, 300);
  const [searchParams, setSearchParams] = useSearchParams();
  const dirFilter = searchParams.get("dir") || "";
  const fromFilter = searchParams.get("from") || "";
  const toFilter = searchParams.get("to") || "";
  const currentPage = Number(searchParams.get("page")) || 1;

  const [sortColumn, setSortColumn] = useState<SortColumn>("date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const apiUrl = buildSessionsUrl(dirFilter, debouncedSearch, fromFilter, toFilter, currentPage);
  const {
    data: paginated,
    error,
    isLoading,
  } = useSWR<PaginatedSessions>(apiUrl, fetcher, { refreshInterval: 5000 });

  // Fetch all sessions (unfiltered) for the project dropdown.
  const { data: allPaginated } = useSWR<PaginatedSessions>(
    "/api/sessions",
    fetcher,
    { refreshInterval: 5000 },
  );

  const sessions = paginated?.sessions;
  const total = paginated?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const sortedSessions = useMemo(() => {
    if (!sessions) return [];
    return [...sessions].sort((a, b) => {
      const aVal = getSortValue(a, sortColumn);
      const bVal = getSortValue(b, sortColumn);
      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [sessions, sortColumn, sortDirection]);

  const onSelect = useCallback(
    (index: number) => {
      const session = sortedSessions[index];
      if (session) navigate(`/session/${session.id}`);
    },
    [sortedSessions, navigate],
  );

  const { selectedIndex } = useKeyboardNavigation({
    itemCount: sortedSessions.length,
    onSelect,
    enabled: !isLoading && sortedSessions.length > 0,
  });

  const uniqueProjects = useMemo(() => {
    if (!allPaginated?.sessions) return [];
    const projects = [...new Set(allPaginated.sessions.map((s) => s.project))];
    return projects.sort();
  }, [allPaginated]);

  function toggleSort(column: SortColumn) {
    if (sortColumn === column) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(column);
      setSortDirection(column === "date" ? "desc" : "asc");
    }
  }

  function setDateRange(from: string, to: string) {
    setSearchParams((prev) => {
      if (from) {
        prev.set("from", from);
      } else {
        prev.delete("from");
      }
      if (to) {
        prev.set("to", to);
      } else {
        prev.delete("to");
      }
      prev.delete("page");
      return prev;
    });
  }

  function setDirFilter(dir: string) {
    setSearchParams((prev) => {
      if (dir) {
        prev.set("dir", dir);
      } else {
        prev.delete("dir");
      }
      prev.delete("page");
      return prev;
    });
  }

  function setPage(page: number) {
    setSearchParams((prev) => {
      if (page <= 1) {
        prev.delete("page");
      } else {
        prev.set("page", String(page));
      }
      return prev;
    });
  }

  const loaded = !error && !isLoading && sessions;

  return (
    <div className="mx-auto max-w-7xl p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Sessions</h1>
        {loaded && (
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {total} session{total !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {error && (
        <p className="mt-4 text-red-600 dark:text-red-400">
          Failed to load sessions. Is the server running?
        </p>
      )}

      <div className="mb-6 flex flex-wrap gap-3">
        <select
          value={dirFilter}
          onChange={(e) => setDirFilter(e.target.value)}
          className="w-[12rem] truncate rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm dark:text-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
        >
          <option value="">All directories</option>
          {uniqueProjects.map((project) => (
            <option key={project} value={project}>
              {projectName(project, uniqueProjects)}
            </option>
          ))}
        </select>
        <DateRangeFilter from={fromFilter} to={toFilter} onChange={setDateRange} />
        <input
          type="text"
          placeholder="Filter by project or topic..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setSearchParams((prev) => {
              prev.delete("page");
              return prev;
            });
          }}
          className="min-w-0 flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-sm dark:text-gray-200 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
        />
      </div>

      <SessionTable
        sessions={loaded ? sortedSessions : []}
        sortColumn={sortColumn}
        sortDirection={sortDirection}
        onToggleSort={toggleSort}
        onDirectoryClick={setDirFilter}
        selectedIndex={selectedIndex}
      />
      {loaded && sortedSessions.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          total={total}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}
