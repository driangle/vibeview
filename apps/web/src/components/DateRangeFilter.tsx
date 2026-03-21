import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type Props = {
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
};

function startOfDay(date: Date): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function endOfDay(date: Date): number {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

function daysAgo(n: number): number {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return startOfDay(d);
}

function toDateStr(ms: string): string {
  if (!ms) return '';
  const d = new Date(Number(ms));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatLabel(from: string, to: string): string {
  if (!from && !to) return 'All time';

  const now = new Date();
  const todayStart = String(startOfDay(now));
  const todayEnd = String(endOfDay(now));
  if (from === todayStart && to === todayEnd) return 'Today';
  if (from === String(daysAgo(7)) && to === todayEnd) return 'Last 7 days';
  if (from === String(daysAgo(30)) && to === todayEnd) return 'Last 30 days';

  const fmt = (ms: string) =>
    new Date(Number(ms)).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const fromDate = fmt(from);
  const toDate = fmt(to);
  return fromDate === toDate ? fromDate : `${fromDate} – ${toDate}`;
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
const DAY_HEADERS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

interface CalendarProps {
  year: number;
  month: number;
  rangeStart: string | null;
  rangeEnd: string | null;
  hoverDate: string | null;
  onDateClick: (dateStr: string) => void;
  onDateHover: (dateStr: string | null) => void;
  onPrev?: () => void;
  onNext?: () => void;
}

function dateStr(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function Calendar({
  year,
  month,
  rangeStart,
  rangeEnd,
  hoverDate,
  onDateClick,
  onDateHover,
  onPrev,
  onNext,
}: CalendarProps) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  const todayStr = dateStr(today.getFullYear(), today.getMonth(), today.getDate());

  // Compute effective range for highlighting
  const effectiveEnd = rangeEnd ?? hoverDate;
  let lo = rangeStart;
  let hi = effectiveEnd;
  if (lo && hi && lo > hi) {
    [lo, hi] = [hi, lo];
  }

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="w-[252px]">
      <div className="mb-2 flex items-center justify-between">
        {onPrev ? (
          <button
            onClick={onPrev}
            className="rounded p-1 text-muted-fg hover:bg-secondary hover:text-fg"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-4 w-4"
            >
              <path
                fillRule="evenodd"
                d="M11.78 5.22a.75.75 0 0 1 0 1.06L8.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        ) : (
          <div className="w-6" />
        )}
        <span className="text-sm font-medium text-fg">
          {MONTH_NAMES[month]} {year}
        </span>
        {onNext ? (
          <button
            onClick={onNext}
            className="rounded p-1 text-muted-fg hover:bg-secondary hover:text-fg"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-4 w-4"
            >
              <path
                fillRule="evenodd"
                d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 1 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        ) : (
          <div className="w-6" />
        )}
      </div>
      <div className="grid grid-cols-7 gap-0">
        {DAY_HEADERS.map((d) => (
          <div key={d} className="flex h-8 items-center justify-center text-xs text-muted-fg">
            {d}
          </div>
        ))}
        {cells.map((day, i) => {
          if (day === null) return <div key={`empty-${i}`} className="h-8" />;
          const ds = dateStr(year, month, day);
          const isToday = ds === todayStr;
          const isFuture = ds > todayStr;
          const isStart = ds === lo;
          const isEnd = ds === hi;
          const isInRange = lo && hi && ds >= lo && ds <= hi;
          const isEndpoint = isStart || isEnd;

          let cellClass = 'h-8 w-full flex items-center justify-center text-sm transition-colors';
          if (isFuture) {
            cellClass += ' text-muted-fg/40 cursor-default';
          } else if (isEndpoint) {
            cellClass += ' bg-primary text-white cursor-pointer';
          } else if (isInRange) {
            cellClass += ' bg-primary/15 text-fg cursor-pointer';
          } else {
            cellClass += ' text-fg hover:bg-secondary cursor-pointer';
          }
          if (isToday && !isEndpoint) {
            cellClass += ' font-bold';
          }
          // Rounding for range endpoints
          if (isStart && isEnd) {
            cellClass += ' rounded';
          } else if (isStart) {
            cellClass += ' rounded-l';
          } else if (isEnd) {
            cellClass += ' rounded-r';
          }

          return (
            <button
              key={ds}
              className={cellClass}
              disabled={isFuture}
              onClick={() => !isFuture && onDateClick(ds)}
              onMouseEnter={() => !isFuture && onDateHover(ds)}
              onMouseLeave={() => onDateHover(null)}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// --- Presets sidebar ---

interface PresetDef {
  label: string;
  getRange: () => [string, string];
}

function usePresets(): PresetDef[] {
  return useMemo(
    () => [
      { label: 'All time', getRange: () => ['', ''] },
      {
        label: 'Today',
        getRange: () => [String(startOfDay(new Date())), String(endOfDay(new Date()))],
      },
      { label: 'Last 7 days', getRange: () => [String(daysAgo(7)), String(endOfDay(new Date()))] },
      {
        label: 'Last 30 days',
        getRange: () => [String(daysAgo(30)), String(endOfDay(new Date()))],
      },
      {
        label: 'Last 90 days',
        getRange: () => [String(daysAgo(90)), String(endOfDay(new Date()))],
      },
    ],
    [],
  );
}

// --- Main component ---

export function DateRangeFilter({ from, to, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const presets = usePresets();

  // Calendar state: show two months, left and right
  const now = new Date();
  const [rightYear, setRightYear] = useState(now.getFullYear());
  const [rightMonth, setRightMonth] = useState(now.getMonth());

  const leftYear = rightMonth === 0 ? rightYear - 1 : rightYear;
  const leftMonth = rightMonth === 0 ? 11 : rightMonth - 1;

  // Selection state for picking a range
  const [pickStart, setPickStart] = useState<string | null>(null);
  const [pickEnd, setPickEnd] = useState<string | null>(null);
  const [hoverDate, setHoverDate] = useState<string | null>(null);

  // Sync pick state when opening
  useEffect(() => {
    if (open) {
      const fromDate = toDateStr(from);
      const toDate = toDateStr(to);
      setPickStart(fromDate || null);
      setPickEnd(toDate || null);
      if (to) {
        const d = new Date(Number(to));
        setRightYear(d.getFullYear());
        setRightMonth(d.getMonth());
      } else {
        setRightYear(now.getFullYear());
        setRightMonth(now.getMonth());
      }
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open]);

  const navigateLeft = useCallback(() => {
    setRightMonth((m) => {
      if (m === 0) {
        setRightYear((y) => y - 1);
        return 11;
      }
      return m - 1;
    });
  }, []);

  const navigateRight = useCallback(() => {
    setRightMonth((m) => {
      if (m === 11) {
        setRightYear((y) => y + 1);
        return 0;
      }
      return m + 1;
    });
  }, []);

  function handleDateClick(ds: string) {
    if (!pickStart || pickEnd) {
      // Start a new selection
      setPickStart(ds);
      setPickEnd(null);
    } else {
      // Complete the selection
      let s = pickStart;
      let e = ds;
      if (s > e) [s, e] = [e, s];
      setPickStart(s);
      setPickEnd(e);
      // Apply immediately
      const fromMs = String(startOfDay(new Date(s + 'T00:00:00')));
      const toMs = String(endOfDay(new Date(e + 'T00:00:00')));
      onChange(fromMs, toMs);
      setOpen(false);
    }
  }

  function applyPreset(preset: PresetDef) {
    const [f, t] = preset.getRange();
    onChange(f, t);
    setOpen(false);
  }

  const isActive = from || to;
  const label = formatLabel(from, to);

  const btnBase =
    'rounded-md border px-3 py-2 text-sm focus:border-ring focus:ring-1 focus:ring-ring focus:outline-none appearance-none text-left';

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className={`${btnBase} w-[180px] ${isActive ? 'border-primary/40 bg-primary/5 text-fg' : 'border-border bg-card text-fg'}`}
      >
        <span className="flex items-center justify-between">
          <span className="truncate">{label}</span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="ml-2 h-4 w-4 shrink-0 text-muted-fg"
          >
            <path
              fillRule="evenodd"
              d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
              clipRule="evenodd"
            />
          </svg>
        </span>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 flex rounded-lg border border-border bg-card shadow-xl">
          {/* Presets */}
          <div className="flex flex-col border-r border-border p-2">
            {presets.map((p) => (
              <button
                key={p.label}
                onClick={() => applyPreset(p)}
                className="whitespace-nowrap rounded px-3 py-1.5 text-left text-sm text-fg hover:bg-secondary"
              >
                {p.label}
              </button>
            ))}
          </div>
          {/* Calendars */}
          <div className="flex gap-4 p-4">
            <Calendar
              year={leftYear}
              month={leftMonth}
              rangeStart={pickStart}
              rangeEnd={pickEnd}
              hoverDate={hoverDate}
              onDateClick={handleDateClick}
              onDateHover={setHoverDate}
              onPrev={navigateLeft}
            />
            <Calendar
              year={rightYear}
              month={rightMonth}
              rangeStart={pickStart}
              rangeEnd={pickEnd}
              hoverDate={hoverDate}
              onDateClick={handleDateClick}
              onDateHover={setHoverDate}
              onNext={navigateRight}
            />
          </div>
        </div>
      )}
    </div>
  );
}
