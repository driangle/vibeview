import { Tooltip } from './Tooltip';
import { useTooltip } from './useTooltip';
import type { MonthCell } from './contribution-graph-builders';
import { MONTH_LABELS, LEVEL_CLASSES, intensityLevel } from './contribution-graph-utils';

interface ContributionMonthGridProps {
  monthCells: MonthCell[];
  maxCount: number;
  height?: number;
  width?: number;
  onCellClick?: (fromDate: string, toDate: string) => void;
}

export function ContributionMonthGrid({
  monthCells,
  maxCount,
  height,
  width,
  onCellClick,
}: ContributionMonthGridProps) {
  const { tooltip, show, hide } = useTooltip();

  const yearRows: { year: number; cells: MonthCell[] }[] = [];
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
              const level = intensityLevel(cell.count, maxCount);
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
                    onClick={() => onCellClick?.(cell.fromDate, cell.toDate)}
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
