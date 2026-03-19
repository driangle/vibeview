import { useEffect, useCallback } from 'react';
import { useSettings } from '../contexts/SettingsContext';

type Theme = 'light' | 'dark';

function getSystemTheme(): Theme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme: Theme) {
  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

function resolveTheme(setting: string): Theme {
  if (setting === 'light' || setting === 'dark') return setting;
  return getSystemTheme();
}

export function useTheme(): { theme: Theme; toggle: () => void } {
  const { settings, updateSettings } = useSettings();
  const theme = resolveTheme(settings.theme);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // Listen for OS preference changes when theme is "system".
  useEffect(() => {
    if (settings.theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => applyTheme(e.matches ? 'dark' : 'light');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [settings.theme]);

  const toggle = useCallback(() => {
    updateSettings({ theme: theme === 'dark' ? 'light' : 'dark' });
  }, [theme, updateSettings]);

  return { theme, toggle };
}
