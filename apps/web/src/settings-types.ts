export interface SortSettings {
  column: string;
  direction: string;
}

export interface Settings {
  theme: string;
  defaultSort: SortSettings;
  pageSize: number;
  dateFormat: string;
  autoFollow: boolean;
  refreshInterval: number;
  messagesPerPage: number;
  recentThreshold: number;
}
