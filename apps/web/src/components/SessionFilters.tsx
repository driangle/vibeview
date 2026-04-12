import { DateRangeFilter } from './DateRangeFilter';
import { projectName } from '../utils';

function ClearFilterButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-fg hover:text-fg p-0.5"
    >
      <svg
        className="h-3.5 w-3.5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    </button>
  );
}

const selectBase =
  'rounded-md border px-3 py-2 text-sm focus:border-ring focus:ring-1 focus:ring-ring focus:outline-none appearance-none';
const selectDefault = `${selectBase} border-border bg-card text-fg`;
const selectActive = `${selectBase} border-primary/40 bg-primary/5 text-fg`;

interface SessionFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  dirFilter: string;
  onDirFilterChange: (value: string) => void;
  modelFilter: string;
  onModelFilterChange: (value: string) => void;
  activityFilter: string;
  onActivityFilterChange: (value: string) => void;
  fromFilter: string;
  toFilter: string;
  onDateRangeChange: (from: string, to: string) => void;
  onResetPage: () => void;
  uniqueProjects: string[];
  uniqueModels: string[];
}

export function SessionFilters({
  search,
  onSearchChange,
  dirFilter,
  onDirFilterChange,
  modelFilter,
  onModelFilterChange,
  activityFilter,
  onActivityFilterChange,
  fromFilter,
  toFilter,
  onDateRangeChange,
  onResetPage,
  uniqueProjects,
  uniqueModels,
}: SessionFiltersProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3">
      <div className="relative flex-1 min-w-[200px]">
        <svg
          className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-fg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          placeholder="Search sessions..."
          value={search}
          onChange={(e) => {
            onSearchChange(e.target.value);
            onResetPage();
          }}
          className="w-full rounded-md border border-border bg-card pl-9 pr-8 py-2 text-sm text-fg placeholder:text-muted-fg focus:border-ring focus:ring-1 focus:ring-ring focus:outline-none"
        />
        {search && (
          <button
            type="button"
            onClick={() => {
              onSearchChange('');
              onResetPage();
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-fg hover:text-fg p-0.5"
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>
      <div className="relative">
        <select
          value={dirFilter}
          onChange={(e) => onDirFilterChange(e.target.value)}
          className={`w-full sm:w-[200px] truncate font-mono ${dirFilter ? `pr-7 ${selectActive}` : selectDefault}`}
        >
          <option value="">All folders</option>
          {uniqueProjects.map((project) => (
            <option key={project} value={project}>
              {projectName(project, uniqueProjects)}
            </option>
          ))}
        </select>
        {dirFilter && <ClearFilterButton onClick={() => onDirFilterChange('')} />}
      </div>
      <div className="relative">
        <select
          value={modelFilter}
          onChange={(e) => onModelFilterChange(e.target.value)}
          className={`w-full sm:w-[180px] truncate ${modelFilter ? `pr-7 ${selectActive}` : selectDefault}`}
        >
          <option value="">All models</option>
          {uniqueModels.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        {modelFilter && <ClearFilterButton onClick={() => onModelFilterChange('')} />}
      </div>
      <div className="relative">
        <select
          value={activityFilter}
          onChange={(e) => onActivityFilterChange(e.target.value)}
          className={`w-full sm:w-[180px] truncate ${activityFilter ? `pr-7 ${selectActive}` : selectDefault}`}
        >
          <option value="">All states</option>
          <option value="working">Working</option>
          <option value="waiting_for_approval">Waiting for approval</option>
          <option value="waiting_for_input">Waiting for input</option>
          <option value="idle">Idle</option>
        </select>
        {activityFilter && <ClearFilterButton onClick={() => onActivityFilterChange('')} />}
      </div>
      <DateRangeFilter from={fromFilter} to={toFilter} onChange={onDateRangeChange} />
    </div>
  );
}
