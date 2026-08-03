import { useCallback, useMemo } from 'react';
import type { ActivityResponse } from '../types';
import { type CellRange, type ViewMode, startOfDay, endOfDay } from './contribution-graph-utils';
import { ContributionDayGrid } from './ContributionDayGrid';
import { ContributionWeekGrid } from './ContributionWeekGrid';
import { ContributionMonthGrid } from './ContributionMonthGrid';

export type { CellRange } from './contribution-graph-utils';
export { ContributionLegend } from './ContributionLegend';

interface ContributionGraphProps {
  activity: Pick<ActivityResponse, 'days' | 'dayYears' | 'weekYears' | 'months'>;
  view: ViewMode;
  height?: number;
  width?: number;
  onCellClick?: (range: CellRange) => void;
}

export function ContributionGraph({
  activity,
  view,
  height,
  width,
  onCellClick,
}: ContributionGraphProps) {
  const dayYears = view === 'day' ? activity.dayYears : null;
  const weekYears = view === 'week' ? activity.weekYears : null;
  const monthCells = view === 'month' ? activity.months : null;
  const maxCount = useMemo(() => {
    if (view === 'day') return Math.max(0, ...activity.days.map((d) => d.count));
    if (view === 'week' && weekYears)
      return Math.max(0, ...weekYears.flatMap((y) => y.cells.map((c) => c.count)));
    if (view === 'month' && monthCells) return Math.max(0, ...monthCells.map((c) => c.count));
    return 0;
  }, [activity.days, view, weekYears, monthCells]);

  const handleClick = useCallback(
    (fromDate: string, toDate: string) => {
      onCellClick?.({ from: startOfDay(fromDate), to: endOfDay(toDate) });
    },
    [onCellClick],
  );

  if (view === 'day' && dayYears && dayYears.length > 0) {
    return (
      <ContributionDayGrid
        dayYears={dayYears}
        maxCount={maxCount}
        height={height}
        width={width}
        onCellClick={onCellClick ? handleClick : undefined}
      />
    );
  }

  if (view === 'week' && weekYears && weekYears.length > 0) {
    return (
      <ContributionWeekGrid
        weekYears={weekYears}
        maxCount={maxCount}
        height={height}
        width={width}
        onCellClick={onCellClick ? handleClick : undefined}
      />
    );
  }

  if (!monthCells) return null;

  return (
    <ContributionMonthGrid
      monthCells={monthCells}
      maxCount={maxCount}
      height={height}
      width={width}
      onCellClick={onCellClick ? handleClick : undefined}
    />
  );
}
