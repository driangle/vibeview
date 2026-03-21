import { useCallback, useMemo, useRef, useState } from 'react';
import type { ActivityDay } from '../types';

type ViewMode = 'day' | 'week' | 'month';

export interface CellRange {
  from: number;
  to: number;
}

interface ContributionGraphProps {
  days: ActivityDay[];
  view: ViewMode;
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

/** Returns "Jan" or "Jan '26" — includes year on the first label and at year boundaries. */
function monthLabel(month: number, year: number, isFirst: boolean, prevYear: number): string {
  const label = MONTH_LABELS[month];
  if (isFirst || year !== prevYear) {
    return `${label} '${String(year).slice(2)}`;
  }
  return label;
}

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

// --- Tooltip ---

interface TooltipState {
  text: string;
  x: number;
  y: number;
}

function Tooltip({ text, x, y }: TooltipState) {
  return (
    <div
      className="pointer-events-none fixed z-50 rounded bg-fg px-2 py-1 text-xs text-bg shadow-lg"
      style={{ left: x, top: y - 32 }}
    >
      {text}
    </div>
  );
}

function useTooltip() {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const show = useCallback((e: React.MouseEvent, text: string) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setTooltip({ text, x: rect.left + rect.width / 2, y: rect.top });
  }, []);

  const hide = useCallback(() => setTooltip(null), []);

  return { tooltip, containerRef, show, hide };
}

// --- Grid builders ---

function buildDayGrid(days: ActivityDay[]) {
  const countMap = new Map(days.map((d) => [d.date, d.count]));
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const start = new Date(today);
  start.setDate(start.getDate() - 364);

  const startDay = start.getDay();
  if (startDay !== 0) {
    start.setDate(start.getDate() - startDay);
  }

  const weeks: { date: string; count: number; dayOfWeek: number }[][] = [];
  let currentWeek: { date: string; count: number; dayOfWeek: number }[] = [];

  const cursor = new Date(start);
  while (cursor <= today) {
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
  if (currentWeek.length > 0) {
    weeks.push(currentWeek);
  }

  const monthLabels: { label: string; col: number }[] = [];
  let lastMonth = -1;
  let lastYear = -1;
  for (let w = 0; w < weeks.length; w++) {
    const firstDay = new Date(weeks[w][0].date);
    const month = firstDay.getMonth();
    if (month !== lastMonth) {
      monthLabels.push({
        label: monthLabel(month, firstDay.getFullYear(), monthLabels.length === 0, lastYear),
        col: w,
      });
      lastYear = firstDay.getFullYear();
      lastMonth = month;
    }
  }

  return { weeks, monthLabels };
}

interface WeekCell {
  tooltip: string;
  count: number;
  month: number;
  fromDate: string;
  toDate: string;
}

function buildWeekGrid(days: ActivityDay[]) {
  const countMap = new Map(days.map((d) => [d.date, d.count]));
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const start = new Date(today);
  start.setDate(start.getDate() - 364);
  const startDay = start.getDay();
  if (startDay !== 0) {
    start.setDate(start.getDate() - startDay);
  }

  const cells: WeekCell[] = [];
  const cursor = new Date(start);
  while (cursor <= today) {
    const weekStart = new Date(cursor);
    const fromDate = cursor.toISOString().slice(0, 10);
    let weekCount = 0;
    let lastDate = fromDate;
    for (let d = 0; d < 7 && cursor <= today; d++) {
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
  let lastYear = -1;
  for (let i = 0; i < cells.length; i++) {
    const weekDate = new Date(start);
    weekDate.setDate(weekDate.getDate() + i * 7);
    if (cells[i].month !== lastMonth) {
      monthLabels.push({
        label: monthLabel(
          cells[i].month,
          weekDate.getFullYear(),
          monthLabels.length === 0,
          lastYear,
        ),
        col: i,
      });
      lastYear = weekDate.getFullYear();
      lastMonth = cells[i].month;
    }
  }

  return { cells, monthLabels };
}

interface MonthCell {
  tooltip: string;
  shortLabel: string;
  count: number;
  fromDate: string;
  toDate: string;
}

function buildMonthGrid(days: ActivityDay[]): MonthCell[] {
  const countMap = new Map(days.map((d) => [d.date, d.count]));
  const today = new Date();
  const cells: MonthCell[] = [];

  for (let i = 11; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const year = d.getFullYear();
    const month = d.getMonth();
    let count = 0;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      count += countMap.get(dateStr) ?? 0;
    }
    const fromDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const toDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;
    const prevYear =
      cells.length > 0
        ? new Date(today.getFullYear(), today.getMonth() - i - 1 + 12, 1).getFullYear()
        : -1;
    cells.push({
      tooltip: `${MONTH_LABELS[month]} ${year}: ${count} session${count !== 1 ? 's' : ''}`,
      shortLabel: monthLabel(month, year, cells.length === 0, prevYear),
      count,
      fromDate,
      toDate,
    });
  }
  return cells;
}

// --- Components ---

export function ContributionGraph({ days, view, onCellClick }: ContributionGraphProps) {
  const dayGrid = useMemo(() => (view === 'day' ? buildDayGrid(days) : null), [days, view]);
  const weekGrid = useMemo(() => (view === 'week' ? buildWeekGrid(days) : null), [days, view]);
  const monthCells = useMemo(() => (view === 'month' ? buildMonthGrid(days) : null), [days, view]);
  const { tooltip, show, hide } = useTooltip();

  const handleClick = useCallback(
    (fromDate: string, toDate: string) => {
      onCellClick?.({ from: startOfDay(fromDate), to: endOfDay(toDate) });
    },
    [onCellClick],
  );

  if (view === 'day' && dayGrid) {
    return (
      <div className="overflow-x-auto">
        {tooltip && <Tooltip {...tooltip} />}
        <div className="inline-block">
          <div className="mb-1 flex" style={{ paddingLeft: '32px' }}>
            {dayGrid.monthLabels.map((m, i) => {
              const nextCol =
                i < dayGrid.monthLabels.length - 1
                  ? dayGrid.monthLabels[i + 1].col
                  : dayGrid.weeks.length;
              const span = nextCol - m.col;
              return (
                <div
                  key={`${m.label}-${m.col}`}
                  className="text-xs text-muted-fg"
                  style={{ width: `${span * 14}px` }}
                >
                  {span >= 2 ? m.label : ''}
                </div>
              );
            })}
          </div>
          <div className="flex gap-0.5">
            <div className="flex flex-col gap-0.5 pr-1">
              {DAY_LABELS.map((label, i) => (
                <div
                  key={i}
                  className="flex h-[10px] w-6 items-center justify-end text-[10px] text-muted-fg"
                >
                  {label}
                </div>
              ))}
            </div>
            {dayGrid.weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-0.5">
                {Array.from({ length: 7 }, (_, di) => {
                  const cell = week.find((c) => c.dayOfWeek === di);
                  if (!cell) return <div key={di} className="h-[10px] w-[10px]" />;
                  const level = intensityLevel(cell.count);
                  const tip = `${formatDate(cell.date)}: ${cell.count} session${cell.count !== 1 ? 's' : ''}`;
                  return (
                    <div
                      key={di}
                      className={`h-[10px] w-[10px] rounded-sm ${LEVEL_CLASSES[level]} ${onCellClick ? 'cursor-pointer' : ''}`}
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
    );
  }

  if (view === 'week' && weekGrid) {
    const cellSize = 22;
    return (
      <div className="overflow-x-auto">
        {tooltip && <Tooltip {...tooltip} />}
        <div className="inline-block">
          <div className="mb-1 flex">
            {weekGrid.monthLabels.map((m, i) => {
              const nextCol =
                i < weekGrid.monthLabels.length - 1
                  ? weekGrid.monthLabels[i + 1].col
                  : weekGrid.cells.length;
              const span = nextCol - m.col;
              return (
                <div
                  key={`${m.label}-${m.col}`}
                  className="text-xs text-muted-fg"
                  style={{ width: `${span * cellSize}px` }}
                >
                  {span >= 2 ? m.label : ''}
                </div>
              );
            })}
          </div>
          <div className="flex gap-1">
            {weekGrid.cells.map((cell, i) => {
              const level = intensityLevel(cell.count);
              return (
                <div
                  key={i}
                  className={`h-[18px] w-[18px] rounded-sm ${LEVEL_CLASSES[level]} ${onCellClick ? 'cursor-pointer' : ''}`}
                  onMouseEnter={(e) => show(e, cell.tooltip)}
                  onMouseLeave={hide}
                  onClick={() => handleClick(cell.fromDate, cell.toDate)}
                />
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  if (!monthCells) return null;

  return (
    <div className="grid grid-cols-6 gap-2 sm:grid-cols-12">
      {tooltip && <Tooltip {...tooltip} />}
      {monthCells.map((cell, i) => {
        const level = intensityLevel(cell.count);
        return (
          <div key={i} className="flex flex-col items-center gap-1">
            <span className="text-xs text-muted-fg">{cell.shortLabel}</span>
            <div
              className={`flex h-10 w-full items-center justify-center rounded ${LEVEL_CLASSES[level]} ${onCellClick ? 'cursor-pointer' : ''}`}
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
          </div>
        );
      })}
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
