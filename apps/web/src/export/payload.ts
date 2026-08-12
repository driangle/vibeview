import type { AppConfig, SessionDetail, SubagentDetail } from '../types';
import type { Settings } from '../settings-types';

/**
 * Everything an exported page needs to render a session with no server.
 *
 * Produced by the CLI (`apps/cli/internal/export`) and embedded in the page.
 * The field names and shapes mirror the API responses so the payload can be
 * handed straight to SWR as preloaded data.
 */
export interface ExportPayload {
  sessionId: string;
  session: SessionDetail;
  /** Only the cost toggle travels: the rest of /api/config is local paths, which
   *  have no place in a file meant to be shared. */
  config: Pick<AppConfig, 'costEnabled'>;
  settings: Settings;
  /** Subagent conversations, keyed by agent ID. */
  subagents: Record<string, SubagentDetail>;
}

/**
 * Maps the payload onto the API URLs the data hooks use as their SWR keys, so
 * `useSessionData`, `useSubagentData`, `useCostUIEnabled` and `SettingsProvider`
 * resolve from memory instead of fetching. Keys must stay in sync with those
 * hooks — a mismatch shows up as a component stuck in its loading state.
 */
export function toSWRFallback(payload: ExportPayload): Record<string, unknown> {
  const fallback: Record<string, unknown> = {
    [`/api/sessions/${payload.sessionId}`]: payload.session,
    '/api/config': payload.config,
    '/api/settings': payload.settings,
  };
  for (const [agentId, detail] of Object.entries(payload.subagents ?? {})) {
    fallback[`/api/sessions/${payload.sessionId}/subagents/${agentId}`] = detail;
  }
  return fallback;
}
