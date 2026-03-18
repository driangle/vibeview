import { useCallback, useEffect, useMemo, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import useSWR from "swr";
import { fetcher } from "../api";
import { DateRangeFilter } from "../components/DateRangeFilter";
import { Pagination } from "../components/Pagination";
import { SessionTable } from "../components/SessionTable";
import type { SortColumn, SortDirection } from "../components/SortHeader";
import { useDebounced } from "../hooks/useDebounced";
import { useKeyboardNavigation } from "../hooks/useKeyboardNavigation";
import { useLocalStorage } from "../hooks/useLocalStorage";
import type { PaginatedSessions, Session } from "../types";
import { projectName } from "../utils";

const PAGE_SIZE = 100;

function buildSessionsUrl(
  project: string,
  q: string,
  from: string,
  to: string,
  model: string,
  page?: number,
): string {
  const params = new URLSearchParams();
  if (project) params.set("project", project);
  if (q) params.set("q", q);
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  if (model) params.set("model", model);
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

const selectClass =
  "rounded-md border border-border bg-card px-3 py-2 text-sm text-fg focus:border-ring focus:ring-1 focus:ring-ring focus:outline-none appearance-none cursor-pointer";

export function SessionList() {
  const navigate = useNavigate();
  const [search, setSearch] = useLocalStorage("filter:search", "");
  const debouncedSearch = useDebounced(search, 300);
  const [searchParams, setSearchParams] = useSearchParams();

  const [storedDir, setStoredDir] = useLocalStorage("filter:dir", "");
  const [storedModel, setStoredModel] = useLocalStorage("filter:model", "");
  const [storedFrom, setStoredFrom] = useLocalStorage("filter:from", "");
  const [storedTo, setStoredTo] = useLocalStorage("filter:to", "");

  const initialized = useRef(false);
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    const hasUrlFilters =
      searchParams.has("dir") || searchParams.has("model") || searchParams.has("from") || searchParams.has("to");
    if (hasUrlFilters) return;
    const needsUpdate = storedDir || storedModel || storedFrom || storedTo;
    if (!needsUpdate) return;
    setSearchParams(
      (prev) => {
        if (storedDir) prev.set("dir", storedDir);
        if (storedModel) prev.set("model", storedModel);
        if (storedFrom) prev.set("from", storedFrom);
        if (storedTo) prev.set("to", storedTo);
        return prev;
      },
      { replace: true },
    );
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const dirFilter = searchParams.get("dir") || "";
  const modelFilter = searchParams.get("model") || "";
  const fromFilter = searchParams.get("from") || "";
  const toFilter = searchParams.get("to") || "";
  const currentPage = Number(searchParams.get("page")) || 1;

  useEffect(() => {
    setStoredDir(dirFilter);
    setStoredModel(modelFilter);
    setStoredFrom(fromFilter);
    setStoredTo(toFilter);
  }, [dirFilter, modelFilter, fromFilter, toFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  const [sortColumn, setSortColumn] = useLocalStorage<SortColumn>("filter:sortColumn", "date");
  const [sortDirection, setSortDirection] = useLocalStorage<SortDirection>("filter:sortDirection", "desc");

  const apiUrl = buildSessionsUrl(dirFilter, debouncedSearch, fromFilter, toFilter, modelFilter, currentPage);
  const {
    data: paginated,
    error,
    isLoading,
  } = useSWR<PaginatedSessions>(apiUrl, fetcher, { refreshInterval: 5000 });

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

  const uniqueModels = useMemo(() => {
    if (!allPaginated?.sessions) return [];
    const models = [...new Set(allPaginated.sessions.map((s) => s.model).filter(Boolean))];
    return models.sort();
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

  function setModelFilter(model: string) {
    setSearchParams((prev) => {
      if (model) {
        prev.set("model", model);
      } else {
        prev.delete("model");
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

  const totalTokens = useMemo(() => {
    if (!sessions) return 0;
    return sessions.reduce((sum, s) => sum + s.usage.inputTokens + s.usage.outputTokens, 0);
  }, [sessions]);

  const totalCost = useMemo(() => {
    if (!sessions) return 0;
    return sessions.reduce((sum, s) => sum + s.usage.costUSD, 0);
  }, [sessions]);

  function formatStatTokens(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
    return String(n);
  }

  return (
    <div className="min-h-screen bg-bg p-6 md:p-10">
      <div className="mx-auto max-w-7xl space-y-6">
        {error && (
          <p className="text-destructive text-sm">
            Failed to load sessions. Is the server running?
          </p>
        )}

        {/* Stats */}
        {loaded && (
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="text-xs text-muted-fg uppercase tracking-wider">Sessions</div>
              <div className="mt-1 text-2xl font-bold text-fg font-sans">{total}</div>
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="text-xs text-muted-fg uppercase tracking-wider">Total Tokens</div>
              <div className="mt-1 text-2xl font-bold text-fg font-sans">{formatStatTokens(totalTokens)}</div>
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="text-xs text-muted-fg uppercase tracking-wider">Total Cost</div>
              <div className="mt-1 text-2xl font-bold text-fg font-sans">${totalCost.toFixed(2)}</div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-fg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Search sessions..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setSearchParams((prev) => {
                  prev.delete("page");
                  return prev;
                });
              }}
              className="w-full rounded-md border border-border bg-card pl-9 pr-3 py-2 text-sm text-fg placeholder:text-muted-fg focus:border-ring focus:ring-1 focus:ring-ring focus:outline-none"
            />
          </div>
          <select
            value={dirFilter}
            onChange={(e) => setDirFilter(e.target.value)}
            className={`w-[200px] truncate ${selectClass}`}
          >
            <option value="">All folders</option>
            {uniqueProjects.map((project) => (
              <option key={project} value={project}>
                {projectName(project, uniqueProjects)}
              </option>
            ))}
          </select>
          <select
            value={modelFilter}
            onChange={(e) => setModelFilter(e.target.value)}
            className={`w-[180px] truncate ${selectClass}`}
          >
            <option value="">All models</option>
            {uniqueModels.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <DateRangeFilter from={fromFilter} to={toFilter} onChange={setDateRange} />
        </div>

        {/* Table */}
        <SessionTable
          sessions={loaded ? sortedSessions : []}
          sortColumn={sortColumn}
          sortDirection={sortDirection}
          onToggleSort={toggleSort}
          onDirectoryClick={setDirFilter}
          onModelClick={setModelFilter}
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

        {/* Footer */}
        <div className="flex items-center gap-2 text-xs text-muted-fg">
          <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
          <span>Last updated just now</span>
        </div>
      </div>
    </div>
  );
}
