import { LEVEL_CLASSES } from './contribution-graph-utils';

export function ContributionLegend() {
  return (
    <div className="flex items-center gap-1 text-xs text-muted-fg">
      <span>Less</span>
      {LEVEL_CLASSES.map((cls, i) => (
        <div key={i} className={`h-[10px] w-[10px] rounded-sm ${cls}`} />
      ))}
      <span>More</span>
    </div>
  );
}
