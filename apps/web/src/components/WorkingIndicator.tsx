export function WorkingIndicator() {
  return (
    <div className="flex items-center gap-2 px-4 py-3 text-sm text-muted-fg">
      <span className="relative flex h-2.5 w-2.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-success" />
      </span>
      <span>Claude is working&hellip;</span>
    </div>
  );
}
