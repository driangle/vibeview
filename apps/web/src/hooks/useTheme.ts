import { useEffect, useCallback } from "react";
import { useLocalStorage } from "./useLocalStorage";

type Theme = "light" | "dark";
type StoredTheme = Theme | null;

function getSystemTheme(): Theme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function applyTheme(theme: Theme) {
  if (theme === "dark") {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
}

export function useTheme(): { theme: Theme; toggle: () => void } {
  const [stored, setStored] = useLocalStorage<StoredTheme>("theme", null);
  const theme: Theme = stored ?? getSystemTheme();

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // Listen for OS preference changes when no saved preference
  useEffect(() => {
    if (stored !== null) return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => applyTheme(e.matches ? "dark" : "light");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [stored]);

  const toggle = useCallback(() => {
    setStored(theme === "dark" ? "light" : "dark");
  }, [theme, setStored]);

  return { theme, toggle };
}
