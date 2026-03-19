import { SessionRow } from './SessionRow';
import { SortHeader } from './SortHeader';
import type { SortColumn, SortDirection } from './SortHeader';
import type { Session } from '../types';

interface SessionTableProps {
  sessions: Session[];
  sortColumn: SortColumn;
  sortDirection: SortDirection;
  onToggleSort: (column: SortColumn) => void;
  onDirectoryClick: (dir: string) => void;
  onModelClick: (model: string) => void;
  selectedIndex?: number;
  isLoaded?: boolean;
  hasFilters?: boolean;
  showCost?: boolean;
  dateFormat?: string;
}

export function SessionTable({
  sessions,
  sortColumn,
  sortDirection,
  onToggleSort,
  onDirectoryClick,
  onModelClick,
  selectedIndex,
  isLoaded,
  hasFilters,
  showCost = true,
  dateFormat,
}: SessionTableProps) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-card">
      <table className="w-full table-fixed">
        <thead>
          <tr className="border-b border-border">
            <SortHeader
              label="Session"
              column="name"
              sortColumn={sortColumn}
              sortDirection={sortDirection}
              onToggle={onToggleSort}
              className="w-[25%]"
            />
            <SortHeader
              label="Directory"
              column="directory"
              sortColumn={sortColumn}
              sortDirection={sortDirection}
              onToggle={onToggleSort}
              className="w-[15%]"
              icon="folder"
            />
            <SortHeader
              label="Time"
              column="date"
              sortColumn={sortColumn}
              sortDirection={sortDirection}
              onToggle={onToggleSort}
              className="w-[15%]"
              icon="clock"
            />
            <SortHeader
              label="Messages"
              column="messages"
              sortColumn={sortColumn}
              sortDirection={sortDirection}
              onToggle={onToggleSort}
              className="w-[10%]"
            />
            <th className="w-[12%] px-4 py-3 text-left text-xs font-semibold text-muted-fg uppercase tracking-wider">
              <span className="inline-flex items-center gap-1.5">
                <svg
                  className="h-3 w-3"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="4" y="4" width="16" height="16" rx="2" />
                  <line x1="4" y1="12" x2="20" y2="12" />
                  <line x1="12" y1="4" x2="12" y2="20" />
                </svg>
                Model
              </span>
            </th>
            <SortHeader
              label="Tokens"
              column="tokens"
              sortColumn={sortColumn}
              sortDirection={sortDirection}
              onToggle={onToggleSort}
              className="w-[13%]"
            />
            {showCost && (
              <SortHeader
                label="Cost"
                column="cost"
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onToggle={onToggleSort}
                className="w-[10%]"
                icon="dollar"
              />
            )}
          </tr>
        </thead>
        <tbody>
          {sessions.map((session, index) => (
            <SessionRow
              key={session.id}
              session={session}
              onDirectoryClick={onDirectoryClick}
              onModelClick={onModelClick}
              isSelected={selectedIndex === index}
              rowIndex={index}
              showCost={showCost}
              dateFormat={dateFormat}
            />
          ))}
          {isLoaded && sessions.length === 0 && (
            <tr>
              <td
                colSpan={showCost ? 7 : 6}
                className="px-4 py-12 text-center text-sm text-muted-fg"
              >
                {hasFilters ? 'No sessions match your filters' : 'No sessions found'}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
