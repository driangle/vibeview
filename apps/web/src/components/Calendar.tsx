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

export function Calendar({
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
