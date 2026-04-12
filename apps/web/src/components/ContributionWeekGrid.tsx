import { Tooltip } from './Tooltip';
import { useTooltip } from './useTooltip';
import type { WeekGridYear } from './contribution-graph-builders';
import { LEVEL_CLASSES, intensityLevel } from './contribution-graph-utils';

interface ContributionWeekGridProps {
  weekYears: WeekGridYear[];
  maxCount: number;
  height?: number;
  width?: number;
  onCellClick?: (fromDate: string, toDate: string) => void;
}

export function ContributionWeekGrid({
  weekYears,
  maxCount,
  height,
  width,
  onCellClick,
}: ContributionWeekGridProps) {
  const { tooltip, show, hide } = useTooltip();

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
                const level = intensityLevel(cell.count, maxCount);
                return (
                  <div
                    key={i}
                    className={`rounded-sm ${LEVEL_CLASSES[level]} ${onCellClick ? 'cursor-pointer' : ''}`}
                    style={{ height: cellSize, width: cellSize }}
                    onMouseEnter={(e) => show(e, cell.tooltip)}
                    onMouseLeave={hide}
                    onClick={() => onCellClick?.(cell.fromDate, cell.toDate)}
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
