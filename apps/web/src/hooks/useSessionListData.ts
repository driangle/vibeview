import { useMemo } from 'react';
import useSWR from 'swr';
import { fetcher } from '../api';
import type { PaginatedSessions, SearchResponse, Session } from '../types';

interface BuildSessionsUrlArgs {
  project: string;
  q: string;
  from: string;
  to: string;
  model: string;
  activityState: string;
  sortColumn: string;
  sortDirection: string;
  pageSize: number;
  page?: number;
  projectId?: string;
}

function buildSessionsUrl(args: BuildSessionsUrlArgs): string {
  const {
    project,
    q,
    from,
    to,
    model,
    activityState,
    sortColumn,
    sortDirection,
    pageSize,
    page,
    projectId,
  } = args;
  const params = new URLSearchParams();
  if (projectId) params.set('project', projectId);
  if (project) params.set('dir', project);
  if (q) params.set('q', q);
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  if (model) params.set('model', model);
  if (activityState) params.set('activityState', activityState);
  if (sortColumn) params.set('sort', sortColumn);
  if (sortDirection) params.set('order', sortDirection);
  if (page !== undefined) {
    params.set('limit', String(pageSize));
    params.set('offset', String((page - 1) * pageSize));
  }
  const qs = params.toString();
  return qs ? `/api/sessions?${qs}` : '/api/sessions';
}

export function formatStatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
  return String(n);
}

interface SessionListFilters {
  dirFilter: string;
  debouncedSearch: string;
  fromFilter: string;
  toFilter: string;
  modelFilter: string;
  activityFilter: string;
  sortColumn: string;
  sortDirection: string;
  currentPage: number;
}

export function useSessionListData(
  filters: SessionListFilters,
  pageSize: number,
  refreshInterval: number,
  activeProjectId: string | undefined,
) {
  const {
    dirFilter,
    debouncedSearch,
    fromFilter,
    toFilter,
    modelFilter,
    activityFilter,
    sortColumn,
    sortDirection,
    currentPage,
  } = filters;

  const apiUrl = buildSessionsUrl({
    project: dirFilter,
    q: debouncedSearch,
    from: fromFilter,
    to: toFilter,
    model: modelFilter,
    activityState: activityFilter,
    sortColumn,
    sortDirection,
    pageSize,
    page: currentPage,
    projectId: activeProjectId,
  });
  const {
    data: paginated,
    error,
    isLoading,
    mutate,
  } = useSWR<PaginatedSessions>(apiUrl, fetcher, {
    refreshInterval,
    keepPreviousData: true,
  });

  const allSessionsUrl = activeProjectId
    ? `/api/sessions?project=${encodeURIComponent(activeProjectId)}`
    : '/api/sessions';
  const { data: allPaginated } = useSWR<PaginatedSessions>(allSessionsUrl, fetcher, {
    refreshInterval,
  });

  const contentSearchUrl = debouncedSearch
    ? `/api/search?q=${encodeURIComponent(debouncedSearch)}&limit=20${activeProjectId ? `&project=${encodeURIComponent(activeProjectId)}` : ''}`
    : null;
  const { data: searchData, isLoading: searchLoading } = useSWR<SearchResponse>(
    contentSearchUrl,
    fetcher,
    { keepPreviousData: true },
  );

  const sessions = paginated?.sessions;
  const total = paginated?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const uniqueProjects = useMemo(() => {
    if (!allPaginated?.sessions) return [];
    const projects = [...new Set(allPaginated.sessions.map((s) => s.dir))];
    return projects.sort();
  }, [allPaginated]);

  const uniqueModels = useMemo(() => {
    if (!allPaginated?.sessions) return [];
    const models = [...new Set(allPaginated.sessions.map((s) => s.model).filter(Boolean))];
    return models.sort();
  }, [allPaginated]);

  const isContentSearch = !!debouncedSearch && !!searchData;
  const displaySessions = useMemo<Session[]>(
    () => (isContentSearch ? searchData.results.map((r) => r.session) : (sessions ?? [])),
    [isContentSearch, searchData, sessions],
  );

  const statsTotal = isContentSearch ? searchData.total : total;

  // Keep the token/cost stat cards in the same scope as the "Sessions" count.
  // - List view: use the server's aggregate over the full filtered set (statsTotal = total).
  // - Content search: the search endpoint returns all matches it counts, so reducing over
  //   the returned results matches searchData.total (statsTotal).
  const searchTotals = useMemo(() => {
    const results = isContentSearch ? searchData.results.map((r) => r.session) : [];
    return {
      tokens: results.reduce((sum, s) => sum + s.usage.inputTokens + s.usage.outputTokens, 0),
      cost: results.reduce((sum, s) => sum + s.usage.costUSD, 0),
    };
  }, [isContentSearch, searchData]);

  const totalTokens = isContentSearch ? searchTotals.tokens : (paginated?.totalTokens ?? 0);
  const totalCost = isContentSearch ? searchTotals.cost : (paginated?.totalCost ?? 0);

  return {
    sessions,
    error,
    isLoading,
    mutate,
    total,
    totalPages,
    searchData,
    searchLoading,
    uniqueProjects,
    uniqueModels,
    displaySessions,
    isContentSearch,
    statsTotal,
    totalTokens,
    totalCost,
  };
}
