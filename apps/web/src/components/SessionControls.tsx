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
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onJumpToLatest?: () => void;
}) {
  const buttonClass =
    'rounded border border-gray-300 dark:border-gray-600 px-3 py-1 text-sm text-gray-700 dark:text-gray-300 transition-colors hover:bg-gray-100 hover:border-gray-400 dark:hover:bg-gray-700 dark:hover:border-gray-500 disabled:cursor-not-allowed disabled:opacity-40';

  return (
    <div className="flex items-center justify-between py-3 print:hidden" data-pagination>
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
      <div className="flex gap-2">
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
  );
}

export function FollowToggle({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      data-follow-toggle
      className={`fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full px-4 py-2 text-sm font-headline font-medium shadow-lg transition-colors print:hidden ${
        enabled
          ? 'bg-primary text-primary-fg hover:opacity-90'
          : 'bg-muted text-muted-fg hover:bg-secondary'
      }`}
      title={enabled ? 'Auto-follow is on' : 'Auto-follow is off'}
    >
      <span className="material-symbols-outlined text-lg">
        {enabled ? 'arrow_downward' : 'vertical_align_bottom'}
      </span>
      {enabled ? 'Following' : 'Follow'}
    </button>
  );
}
