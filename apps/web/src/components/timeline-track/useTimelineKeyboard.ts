import { useEffect } from 'react';
import type { Exchange } from '../../types';

/** Tags whose focused element should swallow navigation keys (only Esc is honoured). */
const TYPING_TAGS = new Set(['INPUT', 'SELECT', 'TEXTAREA']);

interface UseTimelineKeyboardOptions {
  /** Attach the listener only while the Timeline tab is mounted and non-empty. */
  enabled: boolean;
  /** The filtered exchanges, in display order — the list selection moves through. */
  visibleExchanges: Exchange[];
  /** The selected exchange index, or null when none is selected. */
  selectedIndex: number | null;
  /** Move the selection to the given exchange index. */
  onSelectIndex: (index: number) => void;
  /** Open the detail panel for the given exchange (wired by the detail-panel task). */
  onOpen?: (index: number) => void;
  /** Clear the search query (Esc while the search input is focused). */
  onClearSearch: () => void;
}

/**
 * Keyboard navigation for the Timeline Track, scoped to the Timeline tab: `j`/`k`
 * (and ↓/↑) move the selection through the visible list, `e` jumps to the next
 * visible error, `↵` opens the selected exchange. While typing in the search
 * box only `Esc` is honoured (it clears the query); every other key types
 * normally. The listener is removed on unmount, so it never runs on the
 * Conversation tab.
 */
export function useTimelineKeyboard({
  enabled,
  visibleExchanges,
  selectedIndex,
  onSelectIndex,
  onOpen,
  onClearSearch,
}: UseTimelineKeyboardOptions) {
  useEffect(() => {
    if (!enabled) return;

    function handleKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag && TYPING_TAGS.has(tag)) {
        if (e.key === 'Escape') {
          e.preventDefault();
          onClearSearch();
        }
        return;
      }

      const ids = visibleExchanges.map((ex) => ex.index);
      if (ids.length === 0) return;
      const at = selectedIndex === null ? -1 : ids.indexOf(selectedIndex);

      switch (e.key) {
        case 'j':
        case 'ArrowDown':
          e.preventDefault();
          onSelectIndex(ids[Math.min(ids.length - 1, at + 1)] ?? ids[0]);
          break;
        case 'k':
        case 'ArrowUp':
          e.preventDefault();
          onSelectIndex(at <= 0 ? ids[0] : ids[at - 1]);
          break;
        case 'e': {
          e.preventDefault();
          const errors = visibleExchanges.filter((ex) => ex.flags.hasErrors).map((ex) => ex.index);
          if (errors.length === 0) break;
          const cursor = selectedIndex ?? -1;
          onSelectIndex(errors.find((i) => i > cursor) ?? errors[0]);
          break;
        }
        case 'Enter':
          if (selectedIndex !== null) {
            e.preventDefault();
            onOpen?.(selectedIndex);
          }
          break;
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, visibleExchanges, selectedIndex, onSelectIndex, onOpen, onClearSearch]);
}
