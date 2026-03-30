import { useState, useRef, useEffect } from 'react';
import type { UsageTotals } from '../types';
import { formatTokenCount } from '../utils';

function Row({ label, tokens }: { label: string; tokens: number }) {
  if (tokens === 0) return null;
  return (
    <div className="flex justify-between gap-6">
      <span className="text-muted-fg">{label}</span>
      <span className="font-medium tabular-nums">{formatTokenCount(tokens)}</span>
    </div>
  );
}

export function TokenBreakdownPopover({
  usage,
  children,
}: {
  usage: UsageTotals;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const totalTokens =
    usage.inputTokens +
    usage.outputTokens +
    usage.cacheCreationInputTokens +
    usage.cacheReadInputTokens;

  return (
    <div
      ref={ref}
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <div className="cursor-default">{children}</div>
      {open && totalTokens > 0 && (
        <div className="absolute top-full left-0 z-50 w-56 pt-1">
          <div className="rounded-lg border border-border bg-bg p-3 text-xs shadow-lg">
            <div className="flex flex-col gap-1">
              <Row label="Input" tokens={usage.inputTokens} />
              <Row label="Output" tokens={usage.outputTokens} />
              <Row label="Cache write" tokens={usage.cacheCreationInputTokens} />
              <Row label="Cache read" tokens={usage.cacheReadInputTokens} />
            </div>
            <div className="mt-2 flex justify-between border-t border-border pt-2 font-medium">
              <span className="text-muted-fg">Total</span>
              <span className="tabular-nums">{formatTokenCount(totalTokens)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
