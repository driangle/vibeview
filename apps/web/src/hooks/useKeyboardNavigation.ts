import { useCallback, useEffect, useState } from "react";

interface UseKeyboardNavigationOptions {
  itemCount: number;
  onSelect?: (index: number) => void;
  onBack?: () => void;
  enabled?: boolean;
}

const INTERACTIVE_TAGS = new Set(["INPUT", "SELECT", "TEXTAREA"]);

export function useKeyboardNavigation({
  itemCount,
  onSelect,
  onBack,
  enabled = true,
}: UseKeyboardNavigationOptions) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Clamp index when itemCount shrinks
  useEffect(() => {
    if (itemCount === 0) return;
    setSelectedIndex((prev) => Math.min(prev, itemCount - 1));
  }, [itemCount]);

  const scrollToIndex = useCallback((index: number) => {
    const el = document.querySelector(`[data-row-index="${index}"]`);
    el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, []);

  useEffect(() => {
    if (!enabled || itemCount === 0) return;

    function handleKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag && INTERACTIVE_TAGS.has(tag)) return;

      switch (e.key) {
        case "ArrowDown": {
          e.preventDefault();
          setSelectedIndex((prev) => {
            const next = Math.min(prev + 1, itemCount - 1);
            scrollToIndex(next);
            return next;
          });
          break;
        }
        case "ArrowUp": {
          e.preventDefault();
          setSelectedIndex((prev) => {
            const next = Math.max(prev - 1, 0);
            scrollToIndex(next);
            return next;
          });
          break;
        }
        case "Enter":
        case "ArrowRight": {
          e.preventDefault();
          setSelectedIndex((current) => {
            onSelect?.(current);
            return current;
          });
          break;
        }
        case "Escape":
        case "ArrowLeft": {
          e.preventDefault();
          onBack?.();
          break;
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enabled, itemCount, onSelect, onBack, scrollToIndex]);

  return { selectedIndex, setSelectedIndex };
}
