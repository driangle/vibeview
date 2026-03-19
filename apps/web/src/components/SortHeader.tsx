type SortColumn = 'date' | 'name' | 'directory' | 'messages' | 'tokens' | 'cost';
type SortDirection = 'asc' | 'desc';

interface SortHeaderProps {
  label: string;
  column: SortColumn;
  sortColumn: SortColumn;
  sortDirection: SortDirection;
  onToggle: (column: SortColumn) => void;
  className?: string;
  icon?: 'folder' | 'clock' | 'dollar';
}

function HeaderIcon({ icon }: { icon: SortHeaderProps['icon'] }) {
  if (!icon) return null;
  const props = {
    className: 'h-3 w-3',
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };

  switch (icon) {
    case 'folder':
      return (
        <svg {...props}>
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
        </svg>
      );
    case 'clock':
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      );
    case 'dollar':
      return (
        <svg {...props}>
          <line x1="12" y1="1" x2="12" y2="23" />
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      );
  }
}

export function SortHeader({
  label,
  column,
  sortColumn,
  sortDirection,
  onToggle,
  className = '',
  icon,
}: SortHeaderProps) {
  const active = sortColumn === column;
  return (
    <th
      className={`cursor-pointer select-none px-4 py-3 text-left text-xs font-semibold text-muted-fg uppercase tracking-wider hover:text-fg transition-colors ${className}`}
      onClick={() => onToggle(column)}
    >
      <span className="inline-flex items-center gap-1.5">
        <HeaderIcon icon={icon} />
        {label}
        {active && (
          <span className="text-primary">{sortDirection === 'asc' ? '\u25B2' : '\u25BC'}</span>
        )}
      </span>
    </th>
  );
}

export type { SortColumn, SortDirection };
