import { useState } from 'react';
import type { SessionInsights } from '../../../types';
import { SidebarSection, LocateButton } from '../../SidebarSection';
import type { InsightsActions } from '../actions';

/**
 * Errors surfaced in the session: tool name + snippet cards, each with a
 * tab-aware locate button (scroll the conversation, or jump the track to the
 * containing exchange). Shows the first three, then expands.
 */
export function ErrorsSection({
  errors,
  actions,
}: {
  errors: SessionInsights['errors'];
  actions: InsightsActions;
}) {
  const [expanded, setExpanded] = useState(false);

  if (errors.length === 0) return null;

  const visible = expanded ? errors : errors.slice(0, 3);

  return (
    <SidebarSection id="errors" icon="error" title="Errors" count={errors.length}>
      <div className="space-y-1.5">
        {visible.map((err, i) => (
          <div
            key={i}
            className="px-2.5 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 rounded-md flex items-start gap-1.5 group"
          >
            <div className="flex-1 min-w-0">
              <span className="text-[10px] font-headline uppercase tracking-wide text-destructive">
                {err.toolName}
              </span>
              <p className="text-[11px] text-red-800 dark:text-red-300 mt-0.5 line-clamp-2">
                {err.snippet}
              </p>
            </div>
            <LocateButton
              onClick={() => actions.onEntity({ query: '', messageUuid: err.messageUuid })}
            />
          </div>
        ))}
      </div>
      {errors.length > 3 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-2 text-[10px] font-headline uppercase tracking-wide text-muted-fg hover:text-fg transition-colors"
        >
          {expanded ? 'Show less' : `Show all ${errors.length}`}
        </button>
      )}
    </SidebarSection>
  );
}
