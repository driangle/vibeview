import useSWR from 'swr';
import { fetcher } from '../api';
import type { AppConfig } from '../types';

/**
 * Whether cost ($) figures should be shown in the UI.
 *
 * Driven by the server's `VIBEVIEW_COST_ENABLED` env var, surfaced via
 * `/api/config`, so the web UI and the CLI hide/show cost in lockstep with no
 * rebuild. Defaults to hidden while the config is loading or unset — the safe
 * default while token→cost estimation is being reworked (see docs/cost.md).
 *
 * `/api/config` is fetched with SWR, so many components can call this hook and
 * share a single request.
 */
export function useCostUIEnabled(): boolean {
  const { data } = useSWR<AppConfig>('/api/config', fetcher);
  return data?.costEnabled ?? false;
}
