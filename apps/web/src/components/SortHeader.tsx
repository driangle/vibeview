type SortColumn = "date" | "name" | "directory" | "messages" | "tokens" | "cost";
type SortDirection = "asc" | "desc";

interface SortHeaderProps {
  label: string;
  column: SortColumn;
  sortColumn: SortColumn;
  sortDirection: SortDirection;
  onToggle: (column: SortColumn) => void;
}

export function SortHeader({
  label,
  column,
  sortColumn,
  sortDirection,
  onToggle,
}: SortHeaderProps) {
  const active = sortColumn === column;
  return (
    <th
      className="cursor-pointer select-none px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hover:text-gray-700"
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
