import { createContext, useContext } from 'react';
import type { Settings } from '../types';

export const defaults: Settings = {
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

export interface SettingsContextValue {
  settings: Settings;
  updateSettings: (partial: Partial<Settings>) => Promise<void>;
  isLoaded: boolean;
}

export const SettingsContext = createContext<SettingsContextValue>({
  settings: defaults,
  updateSettings: async () => {},
  isLoaded: false,
});

export function useSettings() {
  return useContext(SettingsContext);
}
