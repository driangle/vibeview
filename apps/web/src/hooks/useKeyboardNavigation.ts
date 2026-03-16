import { useCallback, useEffect, useState } from "react";

interface UseKeyboardNavigationOptions {
  itemCount: number;
  onSelect?: (index: number) => void;
  onBack?: () => void;
  enabled?: boolean;
}

const INTERACTIVE_TAGS = new Set(["INPUT", "SELECT", "TEXTAREA"]);
const NAV_KEYS = new Set(["ArrowDown", "ArrowUp", "Enter", "ArrowRight", "Escape", "ArrowLeft"]);

export function useKeyboardNavigation({
  itemCount,
  onSelect,
  onBack,
  enabled = true,
}: UseKeyboardNavigationOptions) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [active, setActive] = useState(false);

  // Clamp index when itemCount shrinks
  useEffect(() => {
    if (itemCount === 0) return;
    setSelectedIndex((prev) => Math.min(prev, itemCount - 1));
  }, [itemCount]);

  // Deactivate on any mouse click
  useEffect(() => {
    if (!active) return;
    function handleClick() {
      setActive(false);
    }
    window.addEventListener("mousedown", handleClick);
    return () => window.removeEventListener("mousedown", handleClick);
  }, [active]);

  const scrollToIndex = useCallback((index: number) => {
    const el = document.querySelector(`[data-row-index="${index}"]`);
    el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, []);

  useEffect(() => {
    if (!enabled || itemCount === 0) return;

    function handleKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag && INTERACTIVE_TAGS.has(tag)) return;
      if (!NAV_KEYS.has(e.key)) return;

      switch (e.key) {
        case "ArrowDown": {
          e.preventDefault();
          setActive(true);
          setSelectedIndex((prev) => {
            const next = Math.min(prev + 1, itemCount - 1);
            scrollToIndex(next);
            return next;
          });
          break;
        }
        case "ArrowUp": {
          e.preventDefault();
          setActive(true);
          setSelectedIndex((prev) => {
            const next = Math.max(prev - 1, 0);
            scrollToIndex(next);
            return next;
          });
          break;
        }
        case "Enter":
        case "ArrowRight": {
          if (!active) return;
          e.preventDefault();
          setSelectedIndex((current) => {
            onSelect?.(current);
            return current;
          });
          break;
        }
        case "Escape":
        case "ArrowLeft": {
          if (!onBack) return;
          e.preventDefault();
          onBack();
          break;
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enabled, itemCount, active, onSelect, onBack, scrollToIndex]);

  return { selectedIndex: active ? selectedIndex : -1, setSelectedIndex };
}
