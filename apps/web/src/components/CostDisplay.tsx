import type { UsageTotals } from '../types';

function formatTokenCount(count: number): string {
  if (count >= 1_000_000) {
    return `${(count / 1_000_000).toFixed(1)}M`;
  }
  if (count >= 1_000) {
    return `${(count / 1_000).toFixed(1)}k`;
  }
  return count.toString();
}

function formatCost(usd: number): string {
  return `$${usd.toFixed(2)}`;
}

interface CostDisplayProps {
  usage: UsageTotals;
}

export function CostDisplay({ usage }: CostDisplayProps) {
  const totalTokens =
    usage.inputTokens +
    usage.outputTokens +
    usage.cacheCreationInputTokens +
    usage.cacheReadInputTokens;

  if (totalTokens === 0) return null;

  return (
    <div className="mt-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-3">
      <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1 text-sm">
        <span className="font-medium text-gray-900 dark:text-gray-100">
          {formatCost(usage.costUSD)}
        </span>
        <span className="text-gray-500 dark:text-gray-400">
          {formatTokenCount(totalTokens)} tokens
        </span>
      </div>
      <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-gray-500 dark:text-gray-400">
        <span>In: {formatTokenCount(usage.inputTokens)}</span>
        <span>Out: {formatTokenCount(usage.outputTokens)}</span>
        {usage.cacheReadInputTokens > 0 && (
          <span>Cache read: {formatTokenCount(usage.cacheReadInputTokens)}</span>
        )}
        {usage.cacheCreationInputTokens > 0 && (
          <span>Cache write: {formatTokenCount(usage.cacheCreationInputTokens)}</span>
        )}
      </div>
    </div>
  );
}
