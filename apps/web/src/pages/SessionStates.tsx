import { ApiError } from '../api';

/** Full-page error state shown when the session fails to load. */
export function SessionErrorState({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  return (
    <div className="mx-auto max-w-4xl p-4 sm:p-8">
      <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
        <p className="text-destructive text-sm">
          Failed to load session{error instanceof ApiError ? ` (HTTP ${error.status})` : ''}.
        </p>
        <button
          onClick={onRetry}
          className="shrink-0 rounded-md bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-fg hover:bg-muted transition-colors"
        >
          Retry
        </button>
      </div>
    </div>
  );
}

/** Full-page placeholder shown while the session loads. */
export function SessionLoadingState() {
  return (
    <div className="mx-auto max-w-4xl p-4 sm:p-8">
      <p className="text-muted-fg">Loading session...</p>
    </div>
  );
}
