import { useCallback, useMemo, useState } from 'react';
import { useDebounce } from './useDebounce';
import { getPreference } from '../utils/preferences';
import { cleanParams } from '../utils/format';

/**
 * Filter + search + pagination state for list pages. Changing any filter
 * resets to page 1; the search box is debounced before it reaches `params`.
 *
 *   const { filters, setFilter, search, setSearch, page, setPage, params } =
 *     useListQuery({ status: '' });
 */
export function useListQuery(initialFilters = {}, { pageSize } = {}) {
  const [filters, setFilters] = useState(initialFilters);
  const [search, setSearchValue] = useState('');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search.trim());
  const limit = pageSize || getPreference('pageSize');

  const setFilter = useCallback((key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  }, []);

  const setSearch = useCallback((value) => {
    setSearchValue(value);
    setPage(1);
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(initialFilters);
    setSearchValue('');
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const params = useMemo(
    () => cleanParams({ ...filters, search: debouncedSearch, page, limit }),
    [filters, debouncedSearch, page, limit],
  );

  // Stable string for effect dependencies
  const paramsKey = JSON.stringify(params);

  return { filters, setFilter, search, setSearch, page, setPage, limit, params, paramsKey, resetFilters };
}
