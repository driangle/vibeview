import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import useSWR from 'swr';
import { ApiError, fetcher } from '../api';
import { DateRangeFilter } from '../components/DateRangeFilter';
import { Pagination } from '../components/Pagination';
import { SearchResults } from '../components/SearchResults';
import { SessionTable } from '../components/SessionTable';
import type { SortColumn, SortDirection } from '../components/SortHeader';
import { useSettings } from '../contexts/SettingsContext';
import { useDebounced } from '../hooks/useDebounced';
import { useKeyboardNavigation } from '../hooks/useKeyboardNavigation';
import { useLocalStorage } from '../hooks/useLocalStorage';
import type { PaginatedSessions, SearchResponse, Session } from '../types';
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

function getSortValue(session: Session, column: SortColumn): string | number {
  switch (column) {
    case 'date':
      return new Date(session.timestamp).getTime();
    case 'name':
      return (session.customTitle || session.slug || session.id).toLowerCase();
    case 'directory':
      return session.project.toLowerCase();
    case 'messages':
      return session.messageCount;
    case 'tokens':
      return session.usage.inputTokens + session.usage.outputTokens;
    case 'cost':
      return session.usage.costUSD;
  }
}

const selectBase =
  'rounded-md border px-3 py-2 text-sm focus:border-ring focus:ring-1 focus:ring-ring focus:outline-none appearance-none';
const selectDefault = `${selectBase} border-border bg-card text-fg`;
const selectActive = `${selectBase} border-primary/40 bg-primary/5 text-fg`;

export function SessionList() {
  const navigate = useNavigate();
  const { settings } = useSettings();
  const [search, setSearch] = useLocalStorage('filter:search', '');
  const debouncedSearch = useDebounced(search, 400);
  const [searchParams, setSearchParams] = useSearchParams();

  const [storedDir, setStoredDir] = useLocalStorage('filter:dir', '');
  const [storedModel, setStoredModel] = useLocalStorage('filter:model', '');
  const [storedActivity, setStoredActivity] = useLocalStorage('filter:activity', '');
  const [storedFrom, setStoredFrom] = useLocalStorage('filter:from', '');
  const [storedTo, setStoredTo] = useLocalStorage('filter:to', '');

  const initialized = useRef(false);
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    const hasUrlFilters =
      searchParams.has('dir') ||
      searchParams.has('model') ||
      searchParams.has('activity') ||
      searchParams.has('from') ||
      searchParams.has('to');
    if (hasUrlFilters) return;
    const needsUpdate = storedDir || storedModel || storedActivity || storedFrom || storedTo;
    if (!needsUpdate) return;
    setSearchParams(
      (prev) => {
        if (storedDir) prev.set('dir', storedDir);
        if (storedModel) prev.set('model', storedModel);
        if (storedActivity) prev.set('activity', storedActivity);
        if (storedFrom) prev.set('from', storedFrom);
        if (storedTo) prev.set('to', storedTo);
        return prev;
      },
      { replace: true },
    );
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const dirFilter = searchParams.get('dir') || '';
  const modelFilter = searchParams.get('model') || '';
  const activityFilter = searchParams.get('activity') || '';
  const fromFilter = searchParams.get('from') || '';
  const toFilter = searchParams.get('to') || '';
  const currentPage = Number(searchParams.get('page')) || 1;

  useEffect(() => {
    setStoredDir(dirFilter);
    setStoredModel(modelFilter);
    setStoredActivity(activityFilter);
    setStoredFrom(fromFilter);
    setStoredTo(toFilter);
  }, [dirFilter, modelFilter, activityFilter, fromFilter, toFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  const [sortColumn, setSortColumn] = useLocalStorage<SortColumn>(
    'filter:sortColumn',
    settings.defaultSort.column as SortColumn,
  );
  const [sortDirection, setSortDirection] = useLocalStorage<SortDirection>(
    'filter:sortDirection',
    settings.defaultSort.direction as SortDirection,
  );

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

  const sortedSessions = useMemo(() => {
    if (!sessions) return [];
    return [...sessions].sort((a, b) => {
      const aVal = getSortValue(a, sortColumn);
      const bVal = getSortValue(b, sortColumn);
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
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
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(column);
      setSortDirection(column === 'date' ? 'desc' : 'asc');
    }
  }

  function setDateRange(from: string, to: string) {
    setSearchParams((prev) => {
      if (from) {
        prev.set('from', from);
      } else {
        prev.delete('from');
      }
      if (to) {
        prev.set('to', to);
      } else {
        prev.delete('to');
      }
      prev.delete('page');
      return prev;
    });
  }

  function setDirFilter(dir: string) {
    setSearchParams((prev) => {
      if (dir) {
        prev.set('dir', dir);
      } else {
        prev.delete('dir');
      }
      prev.delete('page');
      return prev;
    });
  }

  function setModelFilter(model: string) {
    setSearchParams((prev) => {
      if (model) {
        prev.set('model', model);
      } else {
        prev.delete('model');
      }
      prev.delete('page');
      return prev;
    });
  }

  function setActivityFilter(state: string) {
    setSearchParams((prev) => {
      if (state) {
        prev.set('activity', state);
      } else {
        prev.delete('activity');
      }
      prev.delete('page');
      return prev;
    });
  }

  function setPage(page: number) {
    setSearchParams((prev) => {
      if (page <= 1) {
        prev.delete('page');
      } else {
        prev.set('page', String(page));
      }
      return prev;
    });
  }

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

  function formatStatTokens(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
    return String(n);
  }

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
                setSearchParams((prev) => {
                  prev.delete('page');
                  return prev;
                });
              }}
              className="w-full rounded-md border border-border bg-card pl-9 pr-8 py-2 text-sm text-fg placeholder:text-muted-fg focus:border-ring focus:ring-1 focus:ring-ring focus:outline-none"
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setSearchParams((prev) => {
                    prev.delete('page');
                    return prev;
                  });
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
              hasFilters={
                !!(
                  dirFilter ||
                  modelFilter ||
                  activityFilter ||
                  fromFilter ||
                  toFilter ||
                  debouncedSearch
                )
              }
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
