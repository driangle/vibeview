import { Tooltip } from './Tooltip';
import { useTooltip } from './useTooltip';
import type { DayGridYear } from './contribution-graph-builders';
import { DAY_LABELS, LEVEL_CLASSES, intensityLevel, formatDate } from './contribution-graph-utils';

interface ContributionDayGridProps {
  dayYears: DayGridYear[];
  maxCount: number;
  height?: number;
  width?: number;
  onCellClick?: (fromDate: string, toDate: string) => void;
}

export function ContributionDayGrid({
  dayYears,
  maxCount,
  height,
  width,
  onCellClick,
}: ContributionDayGridProps) {
  const { tooltip, show, hide } = useTooltip();

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
                    const level = intensityLevel(cell.count, maxCount);
                    const tip = `${formatDate(cell.date)}: ${cell.count} session${cell.count !== 1 ? 's' : ''}`;
                    return (
                      <div
                        key={di}
                        className={`rounded-sm ${LEVEL_CLASSES[level]} ${onCellClick ? 'cursor-pointer' : ''}`}
                        style={{ height: cellSize, width: cellSize }}
                        onMouseEnter={(e) => show(e, tip)}
                        onMouseLeave={hide}
                        onClick={() => onCellClick?.(cell.date, cell.date)}
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
