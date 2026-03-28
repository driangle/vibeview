export function LiveIndicator({ status }: { status: 'connecting' | 'connected' | 'disconnected' }) {
  if (status === 'disconnected') return null;

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 dark:bg-green-900/30 px-2 py-0.5 text-xs text-green-700 dark:text-green-400">
      <span
        className={`inline-block h-1.5 w-1.5 rounded-full ${
          status === 'connected' ? 'bg-green-500 animate-pulse' : 'bg-yellow-400'
        }`}
      />
      {status === 'connected' ? 'Live' : 'Connecting…'}
    </span>
  );
}

export function Pagination({
  page,
  totalPages,
  onPageChange,
  onJumpToLatest,
  follow,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onJumpToLatest?: () => void;
  follow?: { enabled: boolean; onToggle: () => void };
}) {
  const buttonClass =
    'rounded border border-gray-300 dark:border-gray-600 px-3 py-1 text-sm text-gray-700 dark:text-gray-300 transition-colors hover:bg-gray-100 hover:border-gray-400 dark:hover:bg-gray-700 dark:hover:border-gray-500 disabled:cursor-not-allowed disabled:opacity-40';

  return (
    <div className="py-3 print:hidden" data-pagination>
      <div className="grid grid-cols-3 items-center">
        <div className="flex gap-2">
          <button onClick={() => onPageChange(0)} disabled={page === 0} className={buttonClass}>
            First
          </button>
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page === 0}
            className={buttonClass}
          >
            Previous
          </button>
        </div>
        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Page {page + 1} of {totalPages}
            </span>
            {onJumpToLatest && page < totalPages - 1 && (
              <button
                onClick={onJumpToLatest}
                className="rounded px-2 py-0.5 text-xs font-medium text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/30"
              >
                Jump to latest &darr;
              </button>
            )}
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages - 1}
            className={buttonClass}
          >
            Next
          </button>
          <button
            onClick={() => onPageChange(totalPages - 1)}
            disabled={page >= totalPages - 1}
            className={buttonClass}
          >
            Last
          </button>
        </div>
      </div>
      {follow && (
        <div className="mt-4 flex justify-center">
          <button
            onClick={follow.onToggle}
            data-follow-toggle
            className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${
              follow.enabled
                ? 'bg-primary text-primary-fg hover:opacity-90'
                : 'bg-muted text-muted-fg hover:bg-secondary'
            }`}
          >
            <span className="material-symbols-outlined text-sm">
              {follow.enabled ? 'arrow_downward' : 'vertical_align_bottom'}
            </span>
            {follow.enabled ? 'Following' : 'Follow'}
          </button>
        </div>
      )}
    </div>
  );
}
