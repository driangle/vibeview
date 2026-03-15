import { useMemo } from "react";
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
}

function getSortValue(session: Session, column: SortColumn): string | number {
  switch (column) {
    case "date":
      return new Date(session.timestamp).getTime();
    case "name":
      return (session.customTitle || session.slug || session.id).toLowerCase();
    case "directory":
      return session.project.toLowerCase();
    case "messages":
      return session.messageCount;
    case "tokens":
      return session.usage.inputTokens + session.usage.outputTokens;
    case "cost":
      return session.usage.costUSD;
  }
}

export function SessionTable({
  sessions,
  sortColumn,
  sortDirection,
  onToggleSort,
  onDirectoryClick,
}: SessionTableProps) {
  const sortedSessions = useMemo(() => {
    const sorted = [...sessions].sort((a, b) => {
      const aVal = getSortValue(a, sortColumn);
      const bVal = getSortValue(b, sortColumn);
      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [sessions, sortColumn, sortDirection]);

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50">
            <SortHeader label="Date" column="date" sortColumn={sortColumn} sortDirection={sortDirection} onToggle={onToggleSort} />
            <SortHeader label="Session" column="name" sortColumn={sortColumn} sortDirection={sortDirection} onToggle={onToggleSort} />
            <SortHeader label="Directory" column="directory" sortColumn={sortColumn} sortDirection={sortDirection} onToggle={onToggleSort} />
            <SortHeader label="Messages" column="messages" sortColumn={sortColumn} sortDirection={sortDirection} onToggle={onToggleSort} />
            <SortHeader label="Tokens" column="tokens" sortColumn={sortColumn} sortDirection={sortDirection} onToggle={onToggleSort} />
            <SortHeader label="Cost" column="cost" sortColumn={sortColumn} sortDirection={sortDirection} onToggle={onToggleSort} />
            <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Model
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedSessions.map((session) => (
            <SessionRow
              key={session.id}
              session={session}
              onDirectoryClick={onDirectoryClick}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
