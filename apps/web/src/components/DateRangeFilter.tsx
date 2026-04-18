import { useCallback, useEffect, useRef, useState } from 'react';
import { Calendar } from './Calendar';
import {
  endOfDay,
  formatLabel,
  startOfDay,
  toDateStr,
  usePresets,
  type PresetDef,
} from './date-range-utils';

type Props = {
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
};

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
      // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing local pick state with external props on open
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
  }, [setRightYear]);

  const navigateRight = useCallback(() => {
    setRightMonth((m) => {
      if (m === 11) {
        setRightYear((y) => y + 1);
        return 0;
      }
      return m + 1;
    });
  }, [setRightYear]);

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
