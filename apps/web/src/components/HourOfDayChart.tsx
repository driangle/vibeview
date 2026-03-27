import type { ActivityHour } from '../types';
import { Tooltip } from './Tooltip';
import { useTooltip } from './useTooltip';

const LEVEL_CLASSES = [
  'bg-secondary',
  'bg-primary/20',
  'bg-primary/40',
  'bg-primary/60',
  'bg-primary',
];

function intensityLevel(count: number, max: number): number {
  if (count === 0 || max === 0) return 0;
  const ratio = count / max;
  if (ratio <= 0.25) return 1;
  if (ratio <= 0.5) return 2;
  if (ratio <= 0.75) return 3;
  return 4;
}

function formatHour(hour: number): string {
  if (hour === 0) return '12a';
  if (hour < 12) return `${hour}a`;
  if (hour === 12) return '12p';
  return `${hour - 12}p`;
}

function formatHourRange(hour: number): string {
  const fmt = (h: number) => {
    const suffix = h < 12 ? 'AM' : 'PM';
    const display = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${display}:00 ${suffix}`;
  };
  return `${fmt(hour)} – ${fmt((hour + 1) % 24)}`;
}

const LABEL_HEIGHT = 20;

interface HourOfDayChartProps {
  hours: ActivityHour[];
  height?: number;
}

export function HourOfDayChart({ hours, height }: HourOfDayChartProps) {
  const { tooltip, show, hide } = useTooltip();
  const max = Math.max(...hours.map((h) => h.count));
  const barAreaHeight = height ? height - LABEL_HEIGHT : 120;

  return (
    <div style={height ? { height } : undefined}>
      {tooltip && <Tooltip {...tooltip} />}
      <div className="flex items-end gap-[3px]" style={{ height: barAreaHeight }}>
        {hours.map((h) => {
          const barHeight =
            max > 0 ? Math.max((h.count / max) * barAreaHeight, h.count > 0 ? 4 : 0) : 0;
          const level = intensityLevel(h.count, max);
          const tip = `${formatHourRange(h.hour)}: ${h.count} session${h.count !== 1 ? 's' : ''}`;
          return (
            <div
              key={h.hour}
              className="flex flex-1 items-end justify-center"
              style={{ height: barAreaHeight }}
            >
              <div
                className={`w-full rounded-t-sm ${LEVEL_CLASSES[level]}`}
                style={{ height: barHeight }}
                onMouseEnter={(e) => show(e, tip)}
                onMouseLeave={hide}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-1 flex gap-[3px]">
        {hours.map((h) => (
          <div key={h.hour} className="flex flex-1 justify-center text-[10px] text-muted-fg">
            {h.hour % 3 === 0 ? formatHour(h.hour) : ''}
          </div>
        ))}
      </div>
    </div>
  );
}
