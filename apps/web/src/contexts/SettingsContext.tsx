import { createContext, useContext, useCallback, useEffect, useState } from 'react';
import useSWR from 'swr';
import { fetcher } from '../api';
import type { Settings } from '../types';

const defaults: Settings = {
  theme: 'system',
  defaultSort: { column: 'date', direction: 'desc' },
  pageSize: 100,
  dateFormat: 'relative',
  autoFollow: false,
  refreshInterval: 5000,
  showCost: true,
  customModelPricing: {},
  messagesPerPage: 100,
  recentThreshold: 300000,
};

interface SettingsContextValue {
  settings: Settings;
  updateSettings: (partial: Partial<Settings>) => Promise<void>;
  isLoaded: boolean;
}

const SettingsContext = createContext<SettingsContextValue>({
  settings: defaults,
  updateSettings: async () => {},
  isLoaded: false,
});

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const { data, mutate } = useSWR<Settings>('/api/settings', fetcher);
  const [optimistic, setOptimistic] = useState<Partial<Settings> | null>(null);

  // Merge API data with optimistic updates.
  const settings: Settings = { ...defaults, ...data, ...optimistic };

  // Clear optimistic state once SWR revalidates.
  useEffect(() => {
    if (data && optimistic) setOptimistic(null);
  }, [data]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateSettings = useCallback(
    async (partial: Partial<Settings>) => {
      const merged = { ...settings, ...partial };
      setOptimistic(partial);
      try {
        const res = await fetch('/api/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(merged),
        });
        if (res.ok) {
          const updated = await res.json();
          mutate(updated, false);
        }
      } finally {
        setOptimistic(null);
      }
    },
    [settings, mutate],
  );

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, isLoaded: !!data }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
