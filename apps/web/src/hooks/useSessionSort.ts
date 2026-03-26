import { useMemo } from 'react';
import type { SortColumn, SortDirection } from '../components/SortHeader';
import { useLocalStorage } from './useLocalStorage';
import type { Session } from '../types';

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

export function useSessionSort(
  sessions: Session[] | undefined,
  defaultSort: { column: string; direction: string },
) {
  const [sortColumn, setSortColumn] = useLocalStorage<SortColumn>(
    'filter:sortColumn',
    defaultSort.column as SortColumn,
  );
  const [sortDirection, setSortDirection] = useLocalStorage<SortDirection>(
    'filter:sortDirection',
    defaultSort.direction as SortDirection,
  );

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

  function toggleSort(column: SortColumn) {
    if (sortColumn === column) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(column);
      setSortDirection(column === 'date' ? 'desc' : 'asc');
    }
  }

  return {
    sortColumn,
    sortDirection,
    sortedSessions,
    toggleSort,
  };
}
