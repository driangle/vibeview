import { useCallback, useMemo } from 'react';
import type { ActivityDay } from '../types';
import {
  buildDayGridByYear,
  buildWeekGridByYear,
  buildMonthGrid,
} from './contribution-graph-builders';
import { type CellRange, type ViewMode, startOfDay, endOfDay } from './contribution-graph-utils';
import { ContributionDayGrid } from './ContributionDayGrid';
import { ContributionWeekGrid } from './ContributionWeekGrid';
import { ContributionMonthGrid } from './ContributionMonthGrid';

export type { CellRange } from './contribution-graph-utils';
export { ContributionLegend } from './ContributionLegend';

interface ContributionGraphProps {
  days: ActivityDay[];
  view: ViewMode;
  height?: number;
  width?: number;
  onCellClick?: (range: CellRange) => void;
}

export function ContributionGraph({
  days,
  view,
  height,
  width,
  onCellClick,
}: ContributionGraphProps) {
  const dayYears = useMemo(() => (view === 'day' ? buildDayGridByYear(days) : null), [days, view]);
  const weekYears = useMemo(
    () => (view === 'week' ? buildWeekGridByYear(days) : null),
    [days, view],
  );
  const monthCells = useMemo(() => (view === 'month' ? buildMonthGrid(days) : null), [days, view]);
  const maxCount = useMemo(() => {
    if (view === 'day') return Math.max(0, ...days.map((d) => d.count));
    if (view === 'week' && weekYears)
      return Math.max(0, ...weekYears.flatMap((y) => y.cells.map((c) => c.count)));
    if (view === 'month' && monthCells) return Math.max(0, ...monthCells.map((c) => c.count));
    return 0;
  }, [days, view, weekYears, monthCells]);

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
