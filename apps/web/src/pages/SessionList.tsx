import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiError } from '../api';
import { Pagination } from '../components/Pagination';
import { SearchResults } from '../components/SearchResults';
import { SessionFilters } from '../components/SessionFilters';
import { SessionTable } from '../components/SessionTable';
import { useSettings } from '../contexts/useSettings';
import { Footer } from '../components/Footer';
import { useActiveProject } from '../hooks/useActiveProject';
import { useKeyboardNavigation } from '../hooks/useKeyboardNavigation';
import { useSessionFilters } from '../hooks/useSessionFilters';
import { useSessionSort } from '../hooks/useSessionSort';
import { useSessionListData } from '../hooks/useSessionListData';
import { formatStatTokens } from '../hooks/useSessionListData';

export function SessionList() {
  const navigate = useNavigate();
  const { settings } = useSettings();
  const { activeProjectId } = useActiveProject();

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

  const {
    sessions,
    error,
    isLoading,
    mutate,
    totalPages,
    searchData,
    searchLoading,
    uniqueProjects,
    uniqueModels,
    statsTotal,
    totalTokens,
    totalCost,
    total,
  } = useSessionListData(
    { dirFilter, debouncedSearch, fromFilter, toFilter, modelFilter, activityFilter, currentPage },
    settings.pageSize,
    settings.refreshInterval,
    activeProjectId,
  );

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

  const loaded = !!sessions;

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
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
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
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="text-xs text-muted-fg uppercase tracking-wider">Total Cost</div>
              <div className="mt-1 text-2xl font-bold text-fg font-sans">
                {totalCost > 0 ? `$${totalCost.toFixed(2)}` : '—'}
              </div>
            </div>
          </div>
        )}

        <SessionFilters
          search={search}
          onSearchChange={setSearch}
          dirFilter={dirFilter}
          onDirFilterChange={setDirFilter}
          modelFilter={modelFilter}
          onModelFilterChange={setModelFilter}
          activityFilter={activityFilter}
          onActivityFilterChange={setActivityFilter}
          fromFilter={fromFilter}
          toFilter={toFilter}
          onDateRangeChange={setDateRange}
          onResetPage={resetPage}
          uniqueProjects={uniqueProjects}
          uniqueModels={uniqueModels}
        />

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
              dateFormat={settings.dateFormat}
            />
            {loaded && sortedSessions.length > 0 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                total={total}
                pageSize={settings.pageSize}
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
      <Footer />
    </div>
  );
}
