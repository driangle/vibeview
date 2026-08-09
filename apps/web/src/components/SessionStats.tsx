import { formatStatTokens } from '../hooks/useSessionListData';

interface SessionStatsProps {
  statsTotal: number;
  totalTokens: number;
  totalCost: number;
  showCost: boolean;
}

export function SessionStats({ statsTotal, totalTokens, totalCost, showCost }: SessionStatsProps) {
  return (
    <div className={`grid gap-4 grid-cols-1 ${showCost ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="text-xs text-muted-fg uppercase tracking-wider">Sessions</div>
        <div className="mt-1 text-2xl font-bold text-fg font-sans">{statsTotal}</div>
      </div>
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="text-xs text-muted-fg uppercase tracking-wider">Total Tokens</div>
        <div className="mt-1 text-2xl font-bold text-fg font-sans">
          {formatStatTokens(totalTokens)}
        </div>
      </div>
      {showCost && (
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="text-xs text-muted-fg uppercase tracking-wider">Total Cost</div>
          <div className="mt-1 text-2xl font-bold text-fg font-sans">
            {totalCost > 0 ? `$${totalCost.toFixed(2)}` : '—'}
          </div>
        </div>
      )}
    </div>
  );
}
