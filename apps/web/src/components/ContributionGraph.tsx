import { useCallback, useMemo } from 'react';
import type { ActivityDay } from '../types';
import { Tooltip, useTooltip } from './Tooltip';

type ViewMode = 'day' | 'week' | 'month';

export interface CellRange {
  from: number;
  to: number;
}

interface ContributionGraphProps {
  days: ActivityDay[];
  view: ViewMode;
  height?: number;
  width?: number;
  onCellClick?: (range: CellRange) => void;
}

const MONTH_LABELS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];
const DAY_LABELS = ['Mon', '', 'Wed', '', 'Fri', '', ''];

function intensityLevel(count: number): number {
  if (count === 0) return 0;
  if (count <= 2) return 1;
  if (count <= 4) return 2;
  if (count <= 7) return 3;
  return 4;
}

const LEVEL_CLASSES = [
  'bg-secondary',
  'bg-primary/20',
  'bg-primary/40',
  'bg-primary/60',
  'bg-primary',
];

/** Epoch ms for start of a day (local time). */
function startOfDay(dateStr: string): number {
  const d = new Date(dateStr + 'T00:00:00');
  return d.getTime();
}

/** Epoch ms for end of a day (local time). */
function endOfDay(dateStr: string): number {
  const d = new Date(dateStr + 'T23:59:59.999');
  return d.getTime();
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// --- Grid builders ---

interface DayGridYear {
  year: number;
  weeks: { date: string; count: number; dayOfWeek: number }[][];
  monthLabels: { label: string; col: number }[];
}

function buildDayGridByYear(days: ActivityDay[]): DayGridYear[] {
  if (days.length === 0) return [];

  const countMap = new Map(days.map((d) => [d.date, d.count]));
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dates = days.map((d) => d.date).sort();
  const startYear = parseInt(dates[0].slice(0, 4), 10);
  const endYear = today.getFullYear();

  const yearGrids: DayGridYear[] = [];

  for (let year = startYear; year <= endYear; year++) {
    const yearStart = new Date(year, 0, 1);
    const yearEnd = year === endYear ? today : new Date(year, 11, 31);

    // Align to Sunday before Jan 1.
    const start = new Date(yearStart);
    if (start.getDay() !== 0) start.setDate(start.getDate() - start.getDay());

    const weeks: { date: string; count: number; dayOfWeek: number }[][] = [];
    let currentWeek: { date: string; count: number; dayOfWeek: number }[] = [];

    const cursor = new Date(start);
    while (cursor <= yearEnd) {
      const dateStr = cursor.toISOString().slice(0, 10);
      currentWeek.push({
        date: dateStr,
        count: countMap.get(dateStr) ?? 0,
        dayOfWeek: cursor.getDay(),
      });
      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
      cursor.setDate(cursor.getDate() + 1);
    }
    if (currentWeek.length > 0) weeks.push(currentWeek);

    const monthLabels: { label: string; col: number }[] = [];
    let lastMonth = -1;
    for (let w = 0; w < weeks.length; w++) {
      const firstDay = new Date(weeks[w][0].date);
      const month = firstDay.getMonth();
      if (month !== lastMonth) {
        monthLabels.push({ label: MONTH_LABELS[month], col: w });
        lastMonth = month;
      }
    }

    yearGrids.push({ year, weeks, monthLabels });
  }

  return yearGrids;
}

interface WeekCell {
  tooltip: string;
  count: number;
  month: number;
  fromDate: string;
  toDate: string;
}

interface WeekGridYear {
  year: number;
  cells: WeekCell[];
  monthLabels: { label: string; col: number }[];
}

function buildWeekGridByYear(days: ActivityDay[]): WeekGridYear[] {
  if (days.length === 0) return [];

  const countMap = new Map(days.map((d) => [d.date, d.count]));
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dates = days.map((d) => d.date).sort();
  const startYear = parseInt(dates[0].slice(0, 4), 10);
  const endYear = today.getFullYear();

  const yearGrids: WeekGridYear[] = [];

  for (let year = startYear; year <= endYear; year++) {
    const yearStart = new Date(year, 0, 1);
    const yearEnd = year === endYear ? today : new Date(year, 11, 31);

    const start = new Date(yearStart);
    if (start.getDay() !== 0) start.setDate(start.getDate() - start.getDay());

    const cells: WeekCell[] = [];
    const cursor = new Date(start);
    while (cursor <= yearEnd) {
      const weekStart = new Date(cursor);
      const fromDate = cursor.toISOString().slice(0, 10);
      let weekCount = 0;
      let lastDate = fromDate;
      for (let d = 0; d < 7 && cursor <= yearEnd; d++) {
        const dateStr = cursor.toISOString().slice(0, 10);
        weekCount += countMap.get(dateStr) ?? 0;
        lastDate = dateStr;
        cursor.setDate(cursor.getDate() + 1);
      }
      cells.push({
        tooltip: `${formatDate(fromDate)} – ${formatDate(lastDate)}: ${weekCount} session${weekCount !== 1 ? 's' : ''}`,
        count: weekCount,
        month: weekStart.getMonth(),
        fromDate,
        toDate: lastDate,
      });
    }

    const monthLabels: { label: string; col: number }[] = [];
    let lastMonth = -1;
    for (let i = 0; i < cells.length; i++) {
      if (cells[i].month !== lastMonth) {
        monthLabels.push({ label: MONTH_LABELS[cells[i].month], col: i });
        lastMonth = cells[i].month;
      }
    }

    yearGrids.push({ year, cells, monthLabels });
  }

  return yearGrids;
}

interface MonthCell {
  tooltip: string;
  shortLabel: string;
  count: number;
  fromDate: string;
  toDate: string;
}

function buildMonthGrid(days: ActivityDay[]): MonthCell[] {
  if (days.length === 0) return [];

  const countMap = new Map(days.map((d) => [d.date, d.count]));
  const today = new Date();

  // Find the earliest year in the data.
  const dates = days.map((d) => d.date).sort();
  const startYear = parseInt(dates[0].slice(0, 4), 10);
  const endYear = today.getFullYear();
  const endMonth = today.getMonth();

  const cells: MonthCell[] = [];
  for (let year = startYear; year <= endYear; year++) {
    const firstMonth = year === startYear ? parseInt(dates[0].slice(5, 7), 10) - 1 : 0;
    const lastMonth = year === endYear ? endMonth : 11;
    for (let month = firstMonth; month <= lastMonth; month++) {
      let count = 0;
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        count += countMap.get(dateStr) ?? 0;
      }
      const fromDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
      const toDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;
      cells.push({
        tooltip: `${MONTH_LABELS[month]} ${year}: ${count} session${count !== 1 ? 's' : ''}`,
        shortLabel: MONTH_LABELS[month],
        count,
        fromDate,
        toDate,
      });
    }
  }
  return cells;
}

// --- Components ---

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
  const { tooltip, show, hide } = useTooltip();

  const handleClick = useCallback(
    (fromDate: string, toDate: string) => {
      onCellClick?.({ from: startOfDay(fromDate), to: endOfDay(toDate) });
    },
    [onCellClick],
  );

  if (view === 'day' && dayYears && dayYears.length > 0) {
    const gap = 2;
    const labelWidth = 28;
    const yearLabelH = 20;
    const monthLabelH = 16;
    const rowGap = 12;
    const maxCols = Math.max(...dayYears.map((y) => y.weeks.length));
    const rowCount = dayYears.length;
    const fromHeight = height
      ? Math.floor(
          (height - rowCount * (yearLabelH + monthLabelH + gap * 6) - (rowCount - 1) * rowGap) /
            (rowCount * 7),
        )
      : 10;
    const fromWidth = width
      ? Math.floor((width - labelWidth - gap * (maxCols - 1)) / maxCols)
      : fromHeight;
    const cellSize = Math.max(4, Math.min(fromHeight, fromWidth));
    const gridWidth = labelWidth + maxCols * cellSize + (maxCols - 1) * gap;

    return (
      <div
        className="flex flex-col items-center"
        style={{ gap: rowGap, ...(height ? { height } : {}) }}
      >
        {tooltip && <Tooltip {...tooltip} />}
        {dayYears.map((yearData) => (
          <div key={yearData.year}>
            <div className="mb-1 text-xs font-medium text-muted-fg">{yearData.year}</div>
            <div style={{ width: gridWidth }}>
              <div className="mb-0.5 flex" style={{ paddingLeft: `${labelWidth}px` }}>
                {yearData.monthLabels.map((m, i) => {
                  const nextCol =
                    i < yearData.monthLabels.length - 1
                      ? yearData.monthLabels[i + 1].col
                      : yearData.weeks.length;
                  const span = nextCol - m.col;
                  return (
                    <div
                      key={`${m.label}-${m.col}`}
                      className="text-[10px] text-muted-fg"
                      style={{ width: span * (cellSize + gap) }}
                    >
                      {span >= 2 ? m.label : ''}
                    </div>
                  );
                })}
              </div>
              <div className="flex" style={{ gap }}>
                <div className="flex flex-shrink-0 flex-col" style={{ gap, width: labelWidth }}>
                  {DAY_LABELS.map((label, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-end pr-1 text-[10px] text-muted-fg"
                      style={{ height: cellSize }}
                    >
                      {label}
                    </div>
                  ))}
                </div>
                {yearData.weeks.map((week, wi) => (
                  <div key={wi} className="flex flex-col" style={{ gap }}>
                    {Array.from({ length: 7 }, (_, di) => {
                      const cell = week.find((c) => c.dayOfWeek === di);
                      if (!cell)
                        return <div key={di} style={{ height: cellSize, width: cellSize }} />;
                      const level = intensityLevel(cell.count);
                      const tip = `${formatDate(cell.date)}: ${cell.count} session${cell.count !== 1 ? 's' : ''}`;
                      return (
                        <div
                          key={di}
                          className={`rounded-sm ${LEVEL_CLASSES[level]} ${onCellClick ? 'cursor-pointer' : ''}`}
                          style={{ height: cellSize, width: cellSize }}
                          onMouseEnter={(e) => show(e, tip)}
                          onMouseLeave={hide}
                          onClick={() => handleClick(cell.date, cell.date)}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (view === 'week' && weekYears && weekYears.length > 0) {
    const gap = 2;
    const yearLabelH = 20;
    const monthLabelH = 16;
    const rowGap = 12;
    const maxCells = Math.max(...weekYears.map((y) => y.cells.length));
    const rowCount = weekYears.length;
    const fromHeight = height
      ? Math.floor(
          (height - rowCount * (yearLabelH + monthLabelH) - (rowCount - 1) * rowGap) / rowCount,
        )
      : 18;
    const fromWidth = width ? Math.floor((width - gap * (maxCells - 1)) / maxCells) : fromHeight;
    const cellSize = Math.max(4, Math.min(fromHeight, fromWidth));
    const gridWidth = maxCells * cellSize + (maxCells - 1) * gap;

    return (
      <div
        className="flex flex-col items-center"
        style={{ gap: rowGap, ...(height ? { height } : {}) }}
      >
        {tooltip && <Tooltip {...tooltip} />}
        {weekYears.map((yearData) => (
          <div key={yearData.year}>
            <div className="mb-1 text-xs font-medium text-muted-fg">{yearData.year}</div>
            <div style={{ width: gridWidth }}>
              <div className="mb-0.5 flex">
                {yearData.monthLabels.map((m, i) => {
                  const nextCol =
                    i < yearData.monthLabels.length - 1
                      ? yearData.monthLabels[i + 1].col
                      : yearData.cells.length;
                  const span = nextCol - m.col;
                  return (
                    <div
                      key={`${m.label}-${m.col}`}
                      className="text-[10px] text-muted-fg"
                      style={{ width: span * (cellSize + gap) }}
                    >
                      {span >= 2 ? m.label : ''}
                    </div>
                  );
                })}
              </div>
              <div className="flex" style={{ gap }}>
                {yearData.cells.map((cell, i) => {
                  const level = intensityLevel(cell.count);
                  return (
                    <div
                      key={i}
                      className={`rounded-sm ${LEVEL_CLASSES[level]} ${onCellClick ? 'cursor-pointer' : ''}`}
                      style={{ height: cellSize, width: cellSize }}
                      onMouseEnter={(e) => show(e, cell.tooltip)}
                      onMouseLeave={hide}
                      onClick={() => handleClick(cell.fromDate, cell.toDate)}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!monthCells) return null;

  // Group months by calendar year, each year on its own row.
  const yearRows: { year: number; cells: typeof monthCells }[] = [];
  for (const cell of monthCells) {
    const year = parseInt(cell.fromDate.slice(0, 4), 10);
    const lastRow = yearRows[yearRows.length - 1];
    if (lastRow && lastRow.year === year) {
      lastRow.cells.push(cell);
    } else {
      yearRows.push({ year, cells: [cell] });
    }
  }

  const cellGap = 8;
  const monthLabelHeight = 16;
  const yearLabelHeight = 20;
  const rowCount = yearRows.length;
  const fromHeight = height
    ? Math.floor(
        (height - rowCount * (yearLabelHeight + monthLabelHeight) - (rowCount - 1) * cellGap) /
          rowCount,
      )
    : 40;
  const fromWidth = width ? Math.floor((width - 11 * cellGap) / 12) : fromHeight;
  const cellSize = Math.max(20, Math.min(fromHeight, fromWidth));
  const gridWidth = 12 * cellSize + 11 * cellGap;

  return (
    <div
      className="flex flex-col items-center"
      style={{ gap: cellGap, ...(height ? { height } : {}) }}
    >
      {tooltip && <Tooltip {...tooltip} />}
      {yearRows.map((row) => (
        <div key={row.year} className="flex flex-col items-center">
          <div
            className="mb-1 self-start text-xs font-medium text-muted-fg"
            style={{ width: gridWidth }}
          >
            {row.year}
          </div>
          <div className="flex" style={{ gap: cellGap, width: gridWidth }}>
            {Array.from({ length: 12 }, (_, monthIdx) => {
              const cell = row.cells.find(
                (c) => parseInt(c.fromDate.slice(5, 7), 10) - 1 === monthIdx,
              );
              if (!cell) {
                return (
                  <div
                    key={monthIdx}
                    className="flex flex-col items-center"
                    style={{ width: cellSize }}
                  >
                    <div
                      className="rounded bg-secondary/50"
                      style={{ height: cellSize, width: cellSize }}
                    />
                    <span className="mt-1 text-[10px] text-muted-fg">{MONTH_LABELS[monthIdx]}</span>
                  </div>
                );
              }
              const level = intensityLevel(cell.count);
              return (
                <div
                  key={monthIdx}
                  className="flex flex-col items-center"
                  style={{ width: cellSize }}
                >
                  <div
                    className={`flex items-center justify-center rounded ${LEVEL_CLASSES[level]} ${onCellClick ? 'cursor-pointer' : ''}`}
                    style={{ height: cellSize, width: cellSize }}
                    onMouseEnter={(e) => show(e, cell.tooltip)}
                    onMouseLeave={hide}
                    onClick={() => handleClick(cell.fromDate, cell.toDate)}
                  >
                    <span
                      className={`text-sm font-medium ${level >= 3 ? 'text-white' : 'text-muted-fg'}`}
                    >
                      {cell.count}
                    </span>
                  </div>
                  <span className="mt-1 text-[10px] text-muted-fg">{MONTH_LABELS[monthIdx]}</span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

export function ContributionLegend() {
  return (
    <div className="flex items-center gap-1 text-xs text-muted-fg">
      <span>Less</span>
      {LEVEL_CLASSES.map((cls, i) => (
        <div key={i} className={`h-[10px] w-[10px] rounded-sm ${cls}`} />
      ))}
      <span>More</span>
    </div>
  );
}
