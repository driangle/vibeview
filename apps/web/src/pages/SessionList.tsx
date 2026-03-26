import { useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import useSWR from 'swr';
import { ApiError, fetcher } from '../api';
import { DateRangeFilter } from '../components/DateRangeFilter';
import { Pagination } from '../components/Pagination';
import { SearchResults } from '../components/SearchResults';
import { SessionTable } from '../components/SessionTable';
import { useSettings } from '../contexts/SettingsContext';
import { useKeyboardNavigation } from '../hooks/useKeyboardNavigation';
import { useSessionFilters } from '../hooks/useSessionFilters';
import { useSessionSort } from '../hooks/useSessionSort';
import type { PaginatedSessions, SearchResponse } from '../types';
import { projectName } from '../utils';

function buildSessionsUrl(
  project: string,
  q: string,
  from: string,
  to: string,
  model: string,
  activityState: string,
  pageSize: number,
  page?: number,
): string {
  const params = new URLSearchParams();
  if (project) params.set('project', project);
  if (q) params.set('q', q);
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  if (model) params.set('model', model);
  if (activityState) params.set('activityState', activityState);
  if (page !== undefined) {
    params.set('limit', String(pageSize));
    params.set('offset', String((page - 1) * pageSize));
  }
  const qs = params.toString();
  return qs ? `/api/sessions?${qs}` : '/api/sessions';
}

const selectBase =
  'rounded-md border px-3 py-2 text-sm focus:border-ring focus:ring-1 focus:ring-ring focus:outline-none appearance-none';
const selectDefault = `${selectBase} border-border bg-card text-fg`;
const selectActive = `${selectBase} border-primary/40 bg-primary/5 text-fg`;

function formatStatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
  return String(n);
}

export function SessionList() {
  const navigate = useNavigate();
  const { settings } = useSettings();

  const {
    search,
    setSearch,
    debouncedSearch,
    dirFilter,
    modelFilter,
    activityFilter,
    fromFilter,
    toFilter,
    currentPage,
    setDirFilter,
    setModelFilter,
    setActivityFilter,
    setDateRange,
    setPage,
    resetPage,
    hasFilters,
  } = useSessionFilters();

  const pageSize = settings.pageSize;
  const apiUrl = buildSessionsUrl(
    dirFilter,
    debouncedSearch,
    fromFilter,
    toFilter,
    modelFilter,
    activityFilter,
    pageSize,
    currentPage,
  );
  const {
    data: paginated,
    error,
    isLoading,
    mutate,
  } = useSWR<PaginatedSessions>(apiUrl, fetcher, {
    refreshInterval: settings.refreshInterval,
    keepPreviousData: true,
  });

  const { data: allPaginated } = useSWR<PaginatedSessions>('/api/sessions', fetcher, {
    refreshInterval: settings.refreshInterval,
  });

  const contentSearchUrl = debouncedSearch
    ? `/api/search?q=${encodeURIComponent(debouncedSearch)}&limit=20`
    : null;
  const { data: searchData, isLoading: searchLoading } = useSWR<SearchResponse>(
    contentSearchUrl,
    fetcher,
    { keepPreviousData: true },
  );

  const sessions = paginated?.sessions;
  const total = paginated?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const { sortColumn, sortDirection, sortedSessions, toggleSort } = useSessionSort(
    sessions,
    settings.defaultSort,
  );

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

  const loaded = !error && sessions;

  const isContentSearch = !!debouncedSearch && !!searchData;
  const displaySessions = isContentSearch
    ? searchData.results.map((r) => r.session)
    : (sessions ?? []);

  const statsTotal = isContentSearch ? searchData.total : total;

  const totalTokens = useMemo(() => {
    return displaySessions.reduce((sum, s) => sum + s.usage.inputTokens + s.usage.outputTokens, 0);
  }, [displaySessions]);

  const totalCost = useMemo(() => {
    return displaySessions.reduce((sum, s) => sum + s.usage.costUSD, 0);
  }, [displaySessions]);

  return (
    <div className="min-h-screen bg-bg p-6 md:p-10">
      <div className="mx-auto max-w-7xl space-y-6">
        {error && (
          <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
            <p className="text-destructive text-sm">
              Failed to load sessions
              {error instanceof ApiError ? ` (HTTP ${error.status})` : ''}. Is the server running?
            </p>
            <button
              onClick={() => mutate()}
              className="shrink-0 rounded-md bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-fg hover:bg-muted transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* Stats */}
        {loaded && (
          <div className={`grid gap-4 ${settings.showCost ? 'grid-cols-3' : 'grid-cols-2'}`}>
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="text-xs text-muted-fg uppercase tracking-wider">Sessions</div>
              <div className="mt-1 text-2xl font-bold text-fg font-sans">{statsTotal}</div>
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="text-xs text-muted-fg uppercase tracking-wider">Total Tokens</div>
              <div className="mt-1 text-2xl font-bold text-fg font-sans">
                {formatStatTokens(totalTokens)}
              </div>
            </div>
            {settings.showCost && (
              <div className="rounded-lg border border-border bg-card p-4">
                <div className="text-xs text-muted-fg uppercase tracking-wider">Total Cost</div>
                <div className="mt-1 text-2xl font-bold text-fg font-sans">
                  ${totalCost.toFixed(2)}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <svg
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-fg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Search sessions..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                resetPage();
              }}
              className="w-full rounded-md border border-border bg-card pl-9 pr-8 py-2 text-sm text-fg placeholder:text-muted-fg focus:border-ring focus:ring-1 focus:ring-ring focus:outline-none"
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  resetPage();
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-fg hover:text-fg p-0.5"
              >
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>
          <select
            value={dirFilter}
            onChange={(e) => setDirFilter(e.target.value)}
            className={`w-[200px] truncate ${dirFilter ? selectActive : selectDefault}`}
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
            className={`w-[180px] truncate ${modelFilter ? selectActive : selectDefault}`}
          >
            <option value="">All models</option>
            {uniqueModels.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <select
            value={activityFilter}
            onChange={(e) => setActivityFilter(e.target.value)}
            className={`w-[180px] truncate ${activityFilter ? selectActive : selectDefault}`}
          >
            <option value="">All states</option>
            <option value="working">Working</option>
            <option value="waiting_for_approval">Waiting for approval</option>
            <option value="waiting_for_input">Waiting for input</option>
            <option value="idle">Idle</option>
          </select>
          <DateRangeFilter from={fromFilter} to={toFilter} onChange={setDateRange} />
        </div>

        {/* Results */}
        {debouncedSearch ? (
          <SearchResults
            results={searchData?.results ?? []}
            query={debouncedSearch}
            isLoading={searchLoading}
          />
        ) : (
          <>
            <SessionTable
              sessions={loaded ? sortedSessions : []}
              sortColumn={sortColumn}
              sortDirection={sortDirection}
              onToggleSort={toggleSort}
              onDirectoryClick={setDirFilter}
              onModelClick={setModelFilter}
              selectedIndex={selectedIndex}
              isLoaded={!!loaded}
              hasFilters={hasFilters}
              showCost={settings.showCost}
              dateFormat={settings.dateFormat}
            />
            {loaded && sortedSessions.length > 0 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                total={total}
                pageSize={pageSize}
                onPageChange={setPage}
              />
            )}
          </>
        )}

        {/* Footer */}
        <div className="flex items-center gap-2 text-xs text-muted-fg">
          <svg
            className="h-3 w-3"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
          <span>Last updated just now</span>
        </div>
      </div>
    </div>
  );
}
