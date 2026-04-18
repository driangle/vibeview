export function applyThemePreview(theme: string) {
  const resolved =
    theme === 'system'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
      : theme;
  document.documentElement.classList.toggle('dark', resolved === 'dark');
}

export const selectClass =
  'rounded-md border border-border bg-card px-3 py-2 text-sm text-fg focus:border-ring focus:ring-1 focus:ring-ring focus:outline-none appearance-none';

export const inputClass =
  'rounded-md border border-border bg-card px-3 py-2 text-sm text-fg focus:border-ring focus:ring-1 focus:ring-ring focus:outline-none w-28';

export const refreshOptions = [
  { label: '1s', value: 1000 },
  { label: '2s', value: 2000 },
  { label: '5s', value: 5000 },
  { label: '10s', value: 10000 },
  { label: '30s', value: 30000 },
  { label: '60s', value: 60000 },
];

export const recentThresholdOptions = [
  { label: '1 min', value: 60000 },
  { label: '5 min', value: 300000 },
  { label: '15 min', value: 900000 },
  { label: '30 min', value: 1800000 },
  { label: '1 hour', value: 3600000 },
];
