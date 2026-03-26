import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDebounced } from './useDebounced';
import { useLocalStorage } from './useLocalStorage';

export function useSessionFilters() {
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

  function resetPage() {
    setSearchParams((prev) => {
      prev.delete('page');
      return prev;
    });
  }

  const hasFilters = !!(
    dirFilter ||
    modelFilter ||
    activityFilter ||
    fromFilter ||
    toFilter ||
    debouncedSearch
  );

  return {
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
  };
}
