import { SessionRow } from "./SessionRow";
import { SortHeader } from "./SortHeader";
import type { SortColumn, SortDirection } from "./SortHeader";
import type { Session } from "../types";

interface SessionTableProps {
  sessions: Session[];
  sortColumn: SortColumn;
  sortDirection: SortDirection;
  onToggleSort: (column: SortColumn) => void;
  onDirectoryClick: (dir: string) => void;
  selectedIndex?: number;
}

export function SessionTable({
  sessions,
  sortColumn,
  sortDirection,
  onToggleSort,
  onDirectoryClick,
  selectedIndex,
}: SessionTableProps) {
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
      <table className="w-full table-fixed">
        <thead>
          <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
            <SortHeader label="Date" column="date" sortColumn={sortColumn} sortDirection={sortDirection} onToggle={onToggleSort} className="w-[12%]" />
            <SortHeader label="Session" column="name" sortColumn={sortColumn} sortDirection={sortDirection} onToggle={onToggleSort} className="w-[35%]" />
            <SortHeader label="Directory" column="directory" sortColumn={sortColumn} sortDirection={sortDirection} onToggle={onToggleSort} className="w-[15%]" />
            <SortHeader label="Messages" column="messages" sortColumn={sortColumn} sortDirection={sortDirection} onToggle={onToggleSort} className="w-[8%]" />
            <SortHeader label="Tokens" column="tokens" sortColumn={sortColumn} sortDirection={sortDirection} onToggle={onToggleSort} className="w-[10%]" />
            <SortHeader label="Cost" column="cost" sortColumn={sortColumn} sortDirection={sortDirection} onToggle={onToggleSort} className="w-[8%]" />
            <th className="w-[12%] px-4 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Model
            </th>
          </tr>
        </thead>
        <tbody>
          {sessions.map((session, index) => (
            <SessionRow
              key={session.id}
              session={session}
              onDirectoryClick={onDirectoryClick}
              isSelected={selectedIndex === index}
              rowIndex={index}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
