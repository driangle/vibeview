type Props = {
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
};

type Preset = "all" | "today" | "7d" | "30d";

const selectClass =
  "rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm dark:text-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none";

function startOfDay(date: Date): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function endOfDay(date: Date): number {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

function daysAgo(n: number): number {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return startOfDay(d);
}

function derivePreset(from: string, to: string): Preset {
  if (!from && !to) return "all";

  const now = new Date();
  const todayStart = String(startOfDay(now));
  const todayEnd = String(endOfDay(now));
  const sevenDaysAgo = String(daysAgo(7));
  const thirtyDaysAgo = String(daysAgo(30));

  if (from === todayStart && to === todayEnd) return "today";
  if (from === sevenDaysAgo && to === todayEnd) return "7d";
  if (from === thirtyDaysAgo && to === todayEnd) return "30d";

  return "all";
}

export function DateRangeFilter({ from, to, onChange }: Props) {
  const preset = derivePreset(from, to);

  function handlePresetChange(value: Preset) {
    const now = new Date();
    const todayEnd = String(endOfDay(now));

    switch (value) {
      case "all":
        onChange("", "");
        break;
      case "today":
        onChange(String(startOfDay(now)), todayEnd);
        break;
      case "7d":
        onChange(String(daysAgo(7)), todayEnd);
        break;
      case "30d":
        onChange(String(daysAgo(30)), todayEnd);
        break;
    }
  }

  return (
    <select
      value={preset}
      onChange={(e) => handlePresetChange(e.target.value as Preset)}
      className={selectClass}
    >
      <option value="all">All time</option>
      <option value="today">Today</option>
      <option value="7d">Last 7 days</option>
      <option value="30d">Last 30 days</option>
    </select>
  );
}
