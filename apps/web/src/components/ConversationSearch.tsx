import { useState, useCallback, useRef, useEffect } from 'react';
import useSWR from 'swr';
import { fetcher } from '../api';
import { HighlightedSnippet } from './HighlightedSnippet';
import { SearchShell } from './SearchShell';

interface SearchResult {
  messageUuid: string;
  messageIndex: number;
  role: string;
  snippet: string;
  matchStart: number;
}

const EMPTY_RESULTS: SearchResult[] = [];

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  user: { label: 'You', color: 'text-primary' },
  assistant: { label: 'Claude', color: 'text-violet-600 dark:text-violet-400' },
};

export function ConversationSearch({
  sessionId,
  onNavigateToMessage,
}: {
  sessionId: string;
  onNavigateToMessage: (uuid: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const resultsRef = useRef<HTMLDivElement>(null);

  const searchURL = query.trim()
    ? `/api/search?q=${encodeURIComponent(query)}&limit=100&session=${encodeURIComponent(sessionId)}`
    : null;
  const { data } = useSWR<{ results: SearchResult[] }>(searchURL, fetcher, {
    keepPreviousData: false,
  });
  const results = data?.results ?? EMPTY_RESULTS;

  // Reset active index when results change
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- resetting derived state when search results change
    setActiveIndex(0);
  }, [results]);

  // Scroll active result into view
  useEffect(() => {
    if (!resultsRef.current) return;
    const activeEl = resultsRef.current.querySelector('[data-active="true"]');
    activeEl?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  const navigateToResult = useCallback(
    (index: number) => {
      const result = results[index];
      if (result) {
        onNavigateToMessage(result.messageUuid);
      }
    },
    [results, onNavigateToMessage],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((prev) => Math.min(prev + 1, results.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        navigateToResult(activeIndex);
      }
    },
    [results.length, activeIndex, navigateToResult],
  );

  return (
    <SearchShell title="Search conversation" onClose={() => setQuery('')}>
      {(close) => (
        <>
          <div className="flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-1.5 shadow-sm w-72">
            <span className="material-symbols-outlined text-muted-fg text-lg">search</span>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search conversation..."
              aria-label="Search conversation"
              className="flex-1 bg-transparent text-sm text-fg placeholder:text-muted-fg outline-none"
            />
            {query && (
              <span className="text-[10px] text-muted-fg tabular-nums whitespace-nowrap">
                {results.length > 0 ? `${activeIndex + 1}/${results.length}` : '0 results'}
              </span>
            )}
            {query && results.length > 1 && (
              <div className="flex gap-0.5">
                <button
                  onClick={() => setActiveIndex((prev) => Math.max(prev - 1, 0))}
                  className="text-muted-fg hover:text-fg p-0.5"
                  title="Previous result"
                >
                  <span className="material-symbols-outlined text-sm">keyboard_arrow_up</span>
                </button>
                <button
                  onClick={() => setActiveIndex((prev) => Math.min(prev + 1, results.length - 1))}
                  className="text-muted-fg hover:text-fg p-0.5"
                  title="Next result"
                >
                  <span className="material-symbols-outlined text-sm">keyboard_arrow_down</span>
                </button>
              </div>
            )}
            <button
              onClick={close}
              className="text-muted-fg hover:text-fg p-0.5"
              title="Close search"
            >
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          </div>

          {/* Results dropdown */}
          {query && results.length > 0 && (
            <div
              ref={resultsRef}
              className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg max-h-80 overflow-y-auto z-50"
            >
              {results.map((result, i) => {
                const roleInfo = ROLE_LABELS[result.role] || {
                  label: result.role,
                  color: 'text-muted-fg',
                };
                return (
                  <button
                    key={`${result.messageUuid}-${result.matchStart}`}
                    data-active={i === activeIndex}
                    onClick={() => {
                      setActiveIndex(i);
                      navigateToResult(i);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs border-b border-border last:border-b-0 transition-colors cursor-pointer ${
                      i === activeIndex ? 'bg-primary/10' : 'hover:bg-muted/50'
                    }`}
                  >
                    <span className={`font-medium ${roleInfo.color}`}>{roleInfo.label}</span>
                    <span className="text-muted-fg mx-1.5">&middot;</span>
                    <span className="text-muted-fg font-mono">#{result.messageIndex + 1}</span>
                    <p className="mt-0.5 text-fg/80 leading-relaxed truncate">
                      <HighlightedSnippet snippet={result.snippet} query={query} />
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}
    </SearchShell>
  );
}
