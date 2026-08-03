import type { SortColumn, SortDirection } from '../components/SortHeader';
import { useLocalStorage } from './useLocalStorage';

// Manages the session-list sort state (column + direction) and persists it.
// The actual ordering is applied server-side (see buildSessionsUrl), so pagination
// and sort stay consistent across pages — this hook only owns the UI state.
export function useSessionSort(defaultSort: { column: string; direction: string }) {
  const [sortColumn, setSortColumn] = useLocalStorage<SortColumn>(
    'filter:sortColumn',
    defaultSort.column as SortColumn,
  );
  const [sortDirection, setSortDirection] = useLocalStorage<SortDirection>(
    'filter:sortDirection',
    defaultSort.direction as SortDirection,
  );

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
    toggleSort,
  };
}
