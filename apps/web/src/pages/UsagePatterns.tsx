import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useSWR from 'swr';
import { fetcher } from '../api';
import { ContributionGraph, ContributionLegend } from '../components/ContributionGraph';
import { Footer } from '../components/Footer';
import type { CellRange } from '../components/ContributionGraph';
import { HourOfDayChart } from '../components/HourOfDayChart';
import { useActiveProject } from '../hooks/useActiveProject';
import type { ActivityResponse } from '../types';
import { projectName } from '../utils';

type ViewMode = 'day' | 'week' | 'month' | 'hour';

/** NavBar h-12 (48px) + border-b (1px). Footer is now inside scroll area. */
const CHROME_HEIGHT = 49;
/** Page p-8 top+bottom (64px) + header block ~70px + mb-6 (24px) + card p-6 top+bottom (48px) + card border (2px). */
const INNER_OVERHEAD = 208;
/** Legend row height + mt-4 margin. */
const LEGEND_SPACE = 40;

export function UsagePatterns() {
  const navigate = useNavigate();
  const { activeProjectId } = useActiveProject();
  const [dirFilter, setDirFilter] = useState('');
  const [view, setView] = useState<ViewMode>('day');
  const headerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [chartHeight, setChartHeight] = useState(
    () => window.innerHeight - INNER_OVERHEAD - CHROME_HEIGHT,
  );

  // Reset dir filter when active project changes.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- resetting derived state on prop change
    setDirFilter('');
  }, [activeProjectId]);
  const [chartWidth, setChartWidth] = useState(
    () => Math.min(window.innerWidth - 64, 1280 - 64) - 48,
  );

  useEffect(() => {
    function recalc() {
      const headerH = headerRef.current?.offsetHeight ?? 0;
      // card padding (48) + card border (2)
      const cardChrome = 50;
      const available = window.innerHeight - CHROME_HEIGHT - headerH - 64 - cardChrome;
      setChartHeight(Math.max(available, 100));
      if (cardRef.current) {
        // clientWidth includes padding, subtract p-6 (24px * 2)
        setChartWidth(cardRef.current.clientWidth - 48);
      }
    }
    recalc();
    window.addEventListener('resize', recalc);
    return () => window.removeEventListener('resize', recalc);
  }, []);

  const handleCellClick = useCallback(
    (range: CellRange) => {
      const params = new URLSearchParams();
      params.set('from', String(range.from));
      params.set('to', String(range.to));
      if (dirFilter) params.set('dir', dirFilter);
      if (activeProjectId) params.set('project', activeProjectId);
      navigate(`/?${params.toString()}`);
    },
    [navigate, dirFilter, activeProjectId],
  );

  const activityParams = new URLSearchParams();
  if (activeProjectId) activityParams.set('project', activeProjectId);
  if (dirFilter) activityParams.set('dir', dirFilter);
  const url = activityParams.toString() ? `/api/activity?${activityParams}` : '/api/activity';
  const { data, error, isLoading } = useSWR<ActivityResponse>(url, fetcher, {
    refreshInterval: 30000,
  });

  const totalSessions = useMemo(
    () => (data?.days ?? []).reduce((sum, d) => sum + d.count, 0),
    [data],
  );

  if (error) {
    return (
      <div className="mx-auto max-w-7xl p-8">
        <h1 className="text-2xl font-bold text-fg">Activity</h1>
        <p className="mt-4 text-danger">Failed to load activity data. Is the server running?</p>
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="mx-auto max-w-7xl p-8">
        <h1 className="text-2xl font-bold text-fg">Activity</h1>
        <p className="mt-4 text-muted-fg">Loading activity data...</p>
      </div>
    );
  }

  const graphHeight = Math.max(chartHeight - LEGEND_SPACE, 100);

  return (
    <div className="mx-auto max-w-7xl p-8">
      <div ref={headerRef} className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-fg">Activity</h1>
          <p className="mt-1 text-sm text-muted-fg">
            {totalSessions} session{totalSessions !== 1 ? 's' : ''} across {data.days.length} day
            {data.days.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {data.dirs.length > 1 && (
            <select
              value={dirFilter}
              onChange={(e) => setDirFilter(e.target.value)}
              className="rounded border border-border bg-card px-2 py-1 text-sm text-fg font-mono"
            >
              <option value="">All folders</option>
              {data.dirs.map((p) => (
                <option key={p} value={p}>
                  {projectName(p, data.dirs)}
                </option>
              ))}
            </select>
          )}
          <div className="flex rounded border border-border">
            {(['day', 'week', 'month', 'hour'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setView(mode)}
                className={`px-3 py-1 text-sm capitalize transition-colors ${
                  view === mode ? 'bg-primary text-white' : 'bg-card text-muted-fg hover:text-fg'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div ref={cardRef} className="overflow-hidden rounded-lg border border-border bg-card p-6">
        {view === 'hour' ? (
          <HourOfDayChart hours={data.hours} height={chartHeight} />
        ) : (
          <>
            <ContributionGraph
              days={data.days}
              view={view}
              height={graphHeight}
              width={chartWidth}
              onCellClick={handleCellClick}
            />
            <div className="mt-4 flex justify-end">
              <ContributionLegend />
            </div>
          </>
        )}
      </div>
      <Footer />
    </div>
  );
}
