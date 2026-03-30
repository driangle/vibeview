import { useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useSWR from 'swr';
import { fetcher } from '../api';
import { useActiveProject } from '../hooks/useActiveProject';
import { useKeyboardNavigation } from '../hooks/useKeyboardNavigation';
import { DirectoryName } from '../components/DirectoryName';
import { Footer } from '../components/Footer';
import type { PaginatedSessions, Session } from '../types';
import { formatTime } from '../utils';

interface DirectorySummary {
  dir: string;
  sessionCount: number;
  lastActivity: string;
}

function summarizeDirectories(sessions: Session[]): DirectorySummary[] {
  const map = new Map<string, DirectorySummary>();

  for (const session of sessions) {
    const existing = map.get(session.dir);
    if (existing) {
      existing.sessionCount++;
      if (session.timestamp > existing.lastActivity) {
        existing.lastActivity = session.timestamp;
      }
    } else {
      map.set(session.dir, {
        dir: session.dir,
        sessionCount: 1,
        lastActivity: session.timestamp,
      });
    }
  }

  return [...map.values()].sort(
    (a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime(),
  );
}

export function DirectoryList() {
  const navigate = useNavigate();
  const { activeProjectId } = useActiveProject();
  const sessionsUrl = activeProjectId
    ? `/api/sessions?project=${encodeURIComponent(activeProjectId)}`
    : '/api/sessions';
  const {
    data: paginated,
    error,
    isLoading,
  } = useSWR<PaginatedSessions>(sessionsUrl, fetcher, { refreshInterval: 5000 });

  const sessions = paginated?.sessions;

  const directories = useMemo(() => (sessions ? summarizeDirectories(sessions) : []), [sessions]);

  const onSelect = useCallback(
    (index: number) => {
      const entry = directories[index];
      if (entry) {
        const params = new URLSearchParams();
        params.set('dir', entry.dir);
        if (activeProjectId) params.set('project', activeProjectId);
        navigate(`/?${params.toString()}`);
      }
    },
    [directories, navigate, activeProjectId],
  );

  const { selectedIndex } = useKeyboardNavigation({
    itemCount: directories.length,
    onSelect,
    enabled: !isLoading && directories.length > 0,
  });

  if (error) {
    return (
      <div className="mx-auto max-w-4xl p-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Directories</h1>
        <p className="mt-4 text-red-600 dark:text-red-400">
          Failed to load sessions. Is the server running?
        </p>
      </div>
    );
  }

  if (isLoading || !sessions) {
    return (
      <div className="mx-auto max-w-4xl p-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Directories</h1>
        <p className="mt-4 text-gray-500 dark:text-gray-400">Loading directories...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Directories</h1>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {directories.length} director{directories.length !== 1 ? 'ies' : 'y'}
        </span>
      </div>

      {directories.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400">No directories found.</p>
      ) : (
        <ul className="divide-y divide-gray-100 dark:divide-gray-700 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          {directories.map((entry, index) => (
            <li key={entry.dir} data-row-index={index}>
              <Link
                to={`/?dir=${encodeURIComponent(entry.dir)}${activeProjectId ? `&project=${encodeURIComponent(activeProjectId)}` : ''}`}
                className={`flex items-center gap-4 px-4 py-3 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50${
                  index === selectedIndex ? ' bg-blue-50 dark:bg-blue-900/30' : ''
                }`}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                    <DirectoryName dir={entry.dir} />
                  </p>
                  <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 truncate font-mono">
                    {entry.dir}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-gray-500 dark:text-gray-400">
                  {entry.sessionCount} session{entry.sessionCount !== 1 ? 's' : ''}
                </span>
                <span className="shrink-0 text-xs text-gray-400 dark:text-gray-500">
                  {formatTime(entry.lastActivity)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Footer />
    </div>
  );
}
