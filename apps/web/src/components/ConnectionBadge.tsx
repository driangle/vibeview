import type { BackendStatus } from '../hooks/useBackendStatus';

export function ConnectionBadge({ status }: { status: BackendStatus }) {
  if (status === 'connected') {
    return (
      <span
        title="Connected to the backend server"
        className="flex items-center gap-1.5 font-headline text-[10px] uppercase tracking-widest px-2 py-0.5 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        Connected
      </span>
    );
  }

  return (
    <span
      title="Unable to reach the backend server"
      className="flex items-center gap-1.5 font-headline text-[10px] uppercase tracking-widest px-2 py-0.5 bg-red-50 dark:bg-red-900/30 text-destructive rounded"
    >
      <span className="w-1.5 h-1.5 rounded-full bg-destructive" />
      Disconnected
    </span>
  );
}
