import type { Exchange } from '../../types';
import { CHIP_SPECS, anyFilterActive, type FilterState } from './chips';

/**
 * Pure filtering for the Timeline Track. Given the server-provided `Exchange[]`,
 * a search query, and the toggled chips, it returns the exchanges to show —
 * never deriving new metrics, only narrowing the array. Mirrors the mock's
 * `renderVals()` filter: search is a case-insensitive substring over the
 * exchange's text fields; chips OR-combine (an exchange passes if it matches any
 * active chip).
 */

/** True when the query (trimmed) is empty or is a substring of the exchange's text fields. */
export function matchesQuery(exchange: Exchange, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = [
    exchange.promptPreview,
    exchange.tools.join(' '),
    exchange.files.join(' '),
    exchange.model,
    exchange.commands.join(' '),
    exchange.skills.join(' '),
  ]
    .join(' ')
    .toLowerCase();
  return haystack.includes(q);
}

/** True when no chip is active, or the exchange matches at least one active chip. */
export function matchesFilters(exchange: Exchange, filters: FilterState): boolean {
  if (!anyFilterActive(filters)) return true;
  return CHIP_SPECS.some((spec) => filters[spec.key] && spec.matches(exchange));
}

/** The exchanges that satisfy both the search query and the active chips, in order. */
export function filterExchanges({
  exchanges,
  query,
  filters,
}: {
  exchanges: Exchange[];
  query: string;
  filters: FilterState;
}): Exchange[] {
  return exchanges.filter(
    (exchange) => matchesQuery(exchange, query) && matchesFilters(exchange, filters),
  );
}
