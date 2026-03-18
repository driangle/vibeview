type SortColumn = "date" | "name" | "directory" | "messages" | "tokens" | "cost";
type SortDirection = "asc" | "desc";

interface SortHeaderProps {
  label: string;
  column: SortColumn;
  sortColumn: SortColumn;
  sortDirection: SortDirection;
  onToggle: (column: SortColumn) => void;
  className?: string;
}

export function SortHeader({
  label,
  column,
  sortColumn,
  sortDirection,
  onToggle,
  className = "",
}: SortHeaderProps) {
  const active = sortColumn === column;
  return (
    <th
      className={`cursor-pointer select-none px-4 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide hover:text-gray-700 dark:hover:text-gray-300 ${className}`}
      onClick={() => onToggle(column)}
    >
      {label}
      {active && (
        <span className="ml-1">{sortDirection === "asc" ? "▲" : "▼"}</span>
      )}
    </th>
  );
}

export type { SortColumn, SortDirection };
