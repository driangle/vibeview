import { useEffect, useCallback } from 'react';
import { useSettings } from '../contexts/useSettings';

export type ThemeSetting = 'light' | 'dark' | 'system';
type ResolvedTheme = 'light' | 'dark';

function getSystemTheme(): ResolvedTheme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme: ResolvedTheme) {
  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

function resolveTheme(setting: string): ResolvedTheme {
  if (setting === 'light' || setting === 'dark') return setting;
  return getSystemTheme();
}

const cycleOrder: ThemeSetting[] = ['light', 'dark', 'system'];

export function useTheme(): {
  theme: ResolvedTheme;
  setting: ThemeSetting;
  toggle: () => void;
} {
  const { settings, updateSettings } = useSettings();
  const setting = (
    ['light', 'dark', 'system'].includes(settings.theme) ? settings.theme : 'system'
  ) as ThemeSetting;
  const theme = resolveTheme(setting);

  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem('vibeview:theme', JSON.stringify(setting));
  }, [theme, setting]);

  // Listen for OS preference changes when theme is "system".
  useEffect(() => {
    if (setting !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => applyTheme(e.matches ? 'dark' : 'light');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [setting]);

  const toggle = useCallback(() => {
    const next = cycleOrder[(cycleOrder.indexOf(setting) + 1) % cycleOrder.length];
    applyTheme(resolveTheme(next));
    updateSettings({ theme: next });
  }, [setting, updateSettings]);

  return { theme, setting, toggle };
}
