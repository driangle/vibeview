import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { fetcher } from '../api';
import type { PaginatedSessions } from '../types';
import { projectName } from '../utils';

interface FolderPickerProps {
  selected: string[];
  onChange: (paths: string[]) => void;
}

export function FolderPicker({ selected, onChange }: FolderPickerProps) {
  const [filter, setFilter] = useState('');
  const { data, isLoading } = useSWR<PaginatedSessions>('/api/sessions', fetcher);

  const directories = useMemo(() => {
    if (!data?.sessions) return [];
    const unique = [...new Set(data.sessions.map((s) => s.project))];
    return unique.sort((a, b) => a.localeCompare(b));
  }, [data]);

  const filtered = useMemo(() => {
    if (!filter) return directories;
    const lower = filter.toLowerCase();
    return directories.filter((d) => d.toLowerCase().includes(lower));
  }, [directories, filter]);

  function toggle(path: string) {
    if (selected.includes(path)) {
      onChange(selected.filter((p) => p !== path));
    } else {
      onChange([...selected, path]);
    }
  }

  if (isLoading) {
    return <p className="text-sm text-muted-fg">Loading directories...</p>;
  }

  if (directories.length === 0) {
    return <p className="text-sm text-muted-fg">No directories found.</p>;
  }

  return (
    <div className="space-y-2">
      <input
        type="text"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Filter directories..."
        aria-label="Filter directories"
        className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-fg placeholder:text-muted-fg focus:border-ring focus:ring-1 focus:ring-ring focus:outline-none"
      />
      <div className="max-h-48 overflow-y-auto rounded-lg border border-border">
        {filtered.length === 0 ? (
          <p className="px-3 py-2 text-sm text-muted-fg">No matches.</p>
        ) : (
          <ul className="divide-y divide-border">
            {filtered.map((dir) => (
              <li key={dir}>
                <label className="flex cursor-pointer items-center gap-3 px-3 py-2 transition-colors hover:bg-secondary">
                  <input
                    type="checkbox"
                    checked={selected.includes(dir)}
                    onChange={() => toggle(dir)}
                    className="shrink-0"
                    aria-label={dir}
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-fg">
                      {projectName(dir)}
                    </span>
                    <span className="block truncate text-xs text-muted-fg">{dir}</span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        )}
      </div>
      {selected.length > 0 && (
        <p className="text-xs text-muted-fg">
          {selected.length} folder{selected.length !== 1 ? 's' : ''} selected
        </p>
      )}
    </div>
  );
}
