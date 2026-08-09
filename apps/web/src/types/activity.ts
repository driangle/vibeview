export interface ActivityDay {
  date: string;
  count: number;
}

export interface ActivityHour {
  hour: number;
  count: number;
}

export interface ActivityResponse {
  days: ActivityDay[];
  dayYears: Array<{
    year: number;
    weeks: Array<Array<{ date: string; count: number; dayOfWeek: number }>>;
    monthLabels: Array<{ label: string; col: number }>;
  }>;
  weekYears: Array<{
    year: number;
    cells: Array<{ count: number; month: number; fromDate: string; toDate: string }>;
    monthLabels: Array<{ label: string; col: number }>;
  }>;
  months: { shortLabel: string; count: number; fromDate: string; toDate: string }[];
  hours: ActivityHour[];
  dirs: string[];
}
