import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import type { MessageResponse } from '../types';
import { processMessageContent } from '../lib/parsers';

export interface SearchResult {
  messageUuid: string;
  messageIndex: number;
  role: string;
  snippet: string;
  matchStart: number;
}

function getSearchableText(message: MessageResponse): string {
  const content = message.message?.content;
  if (typeof content === 'string') {
    const segments = processMessageContent(content);
    return segments
      .filter((s) => s.type === 'text')
      .map((s) => s.content)
      .join('\n');
  }
  if (Array.isArray(content)) {
    return content
      .filter((b) => b.type === 'text' && b.text)
      .map((b) => {
        const segments = processMessageContent(b.text!);
        return segments
          .filter((s) => s.type === 'text')
          .map((s) => s.content)
          .join('\n');
      })
      .join('\n');
  }
  return '';
}

function buildSnippet(text: string, matchIndex: number, query: string): string {
  const contextChars = 40;
  const start = Math.max(0, matchIndex - contextChars);
  const end = Math.min(text.length, matchIndex + query.length + contextChars);
  let snippet = '';
  if (start > 0) snippet += '...';
  snippet += text.slice(start, end);
  if (end < text.length) snippet += '...';
  return snippet;
}

function searchMessages(messages: MessageResponse[], query: string): SearchResult[] {
  if (!query.trim()) return [];
  const lowerQuery = query.toLowerCase();
  const results: SearchResult[] = [];

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    const text = getSearchableText(msg);
    const lowerText = text.toLowerCase();

    let searchFrom = 0;
    while (searchFrom < lowerText.length) {
      const idx = lowerText.indexOf(lowerQuery, searchFrom);
      if (idx === -1) break;

      results.push({
        messageUuid: msg.uuid,
        messageIndex: i,
        role: msg.type === 'user' ? 'user' : msg.type === 'assistant' ? 'assistant' : msg.type,
        snippet: buildSnippet(text, idx, query),
        matchStart: idx,
      });
      searchFrom = idx + 1;

      // Cap results per message to avoid flooding
      if (results.length >= 200) return results;
    }
  }

  return results;
}

function HighlightedSnippet({ snippet, query }: { snippet: string; query: string }) {
  if (!query) return <span>{snippet}</span>;

  const parts: { text: string; highlight: boolean }[] = [];
  const lowerSnippet = snippet.toLowerCase();
  const lowerQuery = query.toLowerCase();
  let cursor = 0;

  while (cursor < snippet.length) {
    const idx = lowerSnippet.indexOf(lowerQuery, cursor);
    if (idx === -1) {
      parts.push({ text: snippet.slice(cursor), highlight: false });
      break;
    }
    if (idx > cursor) {
      parts.push({ text: snippet.slice(cursor, idx), highlight: false });
    }
    parts.push({ text: snippet.slice(idx, idx + query.length), highlight: true });
    cursor = idx + query.length;
  }

  return (
    <span>
      {parts.map((part, i) =>
        part.highlight ? (
          <mark key={i} className="bg-yellow-300 dark:bg-yellow-600/60 text-fg rounded-sm px-0.5">
            {part.text}
          </mark>
        ) : (
          <span key={i}>{part.text}</span>
        ),
      )}
    </span>
  );
}

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  user: { label: 'You', color: 'text-primary' },
  assistant: { label: 'Claude', color: 'text-violet-600 dark:text-violet-400' },
};

export function ConversationSearch({
  messages,
  onNavigateToMessage,
}: {
  messages: MessageResponse[];
  onNavigateToMessage: (uuid: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const results = useMemo(() => searchMessages(messages, query), [messages, query]);

  // Reset active index when results change
  useEffect(() => {
    setActiveIndex(0);
  }, [results]);

  // Scroll active result into view
  useEffect(() => {
    if (!resultsRef.current) return;
    const activeEl = resultsRef.current.querySelector('[data-active="true"]');
    activeEl?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  // Keyboard shortcut to open (Cmd/Ctrl+F)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open]);

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
      } else if (e.key === 'Escape') {
        setOpen(false);
      }
    },
    [results.length, activeIndex, navigateToResult],
  );

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-muted-fg hover:text-fg transition-colors print:hidden"
        title="Search conversation (Ctrl+F)"
      >
        <span className="material-symbols-outlined text-xl">search</span>
      </button>
    );
  }

  return (
    <div className="print:hidden relative">
      {/* Search trigger (hidden when open, for layout) */}
      <div className="flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-1.5 shadow-sm w-72">
        <span className="material-symbols-outlined text-muted-fg text-lg">search</span>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search conversation..."
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
          onClick={() => {
            setOpen(false);
            setQuery('');
          }}
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
    </div>
  );
}
