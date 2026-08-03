// Render contracts for server-built contribution buckets. Calendar aggregation
// belongs to the Go activity endpoint; these types keep the grid components thin.
export interface DayGridYear {
  year: number;
  weeks: { date: string; count: number; dayOfWeek: number }[][];
  monthLabels: { label: string; col: number }[];
}

export interface WeekCell {
  count: number;
  month: number;
  fromDate: string;
  toDate: string;
}

export interface WeekGridYear {
  year: number;
  cells: WeekCell[];
  monthLabels: { label: string; col: number }[];
}

export interface MonthCell {
  shortLabel: string;
  count: number;
  fromDate: string;
  toDate: string;
}
