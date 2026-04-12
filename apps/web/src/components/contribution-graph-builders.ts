import type { ActivityDay } from '../types';
import { MONTH_LABELS, formatDate } from './contribution-graph-utils';

// --- Day grid ---

export interface DayGridYear {
  year: number;
  weeks: { date: string; count: number; dayOfWeek: number }[][];
  monthLabels: { label: string; col: number }[];
}

export function buildDayGridByYear(days: ActivityDay[]): DayGridYear[] {
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

// --- Week grid ---

export interface WeekCell {
  tooltip: string;
  count: number;
  month: number;
  fromDate: string;
  toDate: string;
}

export interface WeekGridYear {
  year: number;
  cells: WeekCell[];
  monthLabels: { label: string; col: number }[];
}

export function buildWeekGridByYear(days: ActivityDay[]): WeekGridYear[] {
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

// --- Month grid ---

export interface MonthCell {
  tooltip: string;
  shortLabel: string;
  count: number;
  fromDate: string;
  toDate: string;
}

export function buildMonthGrid(days: ActivityDay[]): MonthCell[] {
  if (days.length === 0) return [];

  const countMap = new Map(days.map((d) => [d.date, d.count]));
  const today = new Date();

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
