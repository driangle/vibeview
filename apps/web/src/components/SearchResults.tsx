import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { SearchResult } from '../types';
import { formatTime, projectName } from '../utils';

interface SearchResultsProps {
  results: SearchResult[];
  query: string;
  isLoading: boolean;
}

function highlightMatch(text: string, query: string) {
  if (!query) return text;
  const lower = text.toLowerCase();
  const qLower = query.toLowerCase();
  const idx = lower.indexOf(qLower);
  if (idx < 0) return text;

  const parts: ReactNode[] = [];
  let lastEnd = 0;

  let pos = 0;
  let searchFrom = 0;
  while (searchFrom < lower.length) {
    pos = lower.indexOf(qLower, searchFrom);
    if (pos < 0) break;
    if (pos > lastEnd) {
      parts.push(text.slice(lastEnd, pos));
    }
    parts.push(
      <mark key={pos} className="bg-accent/30 text-fg rounded-sm px-0.5">
        {text.slice(pos, pos + query.length)}
      </mark>,
    );
    lastEnd = pos + query.length;
    searchFrom = lastEnd;
  }

  if (lastEnd < text.length) {
    parts.push(text.slice(lastEnd));
  }

  return <>{parts}</>;
}

export function SearchResults({ results, query, isLoading }: SearchResultsProps) {
  if (isLoading) {
    return (
      <div className="rounded-lg border border-border bg-card p-8 text-center text-muted-fg text-sm">
        Searching session contents...
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-8 text-center text-muted-fg text-sm">
        No sessions found matching &ldquo;{query}&rdquo;
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="text-xs text-muted-fg mb-2">
        {results.length} result{results.length !== 1 ? 's' : ''} found
      </div>
      {results.map((result) => {
        const name = result.session.customTitle || result.session.slug || result.session.id;
        return (
          <Link
            key={result.session.id}
            to={`/session/${result.session.id}`}
            className="block rounded-lg border border-border bg-card p-4 hover:border-ring transition-colors"
          >
            <div className="flex items-baseline justify-between gap-2 mb-1">
              <span className="text-sm font-medium text-fg truncate">{name}</span>
              <span className="text-xs text-muted-fg whitespace-nowrap">
                {formatTime(result.session.timestamp)}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-fg mb-2">
              <span>{projectName(result.session.project)}</span>
              {result.session.model && (
                <>
                  <span>&middot;</span>
                  <span>{result.session.model}</span>
                </>
              )}
            </div>
            <div className="text-sm text-muted-fg leading-relaxed">
              {highlightMatch(result.snippet, query)}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
