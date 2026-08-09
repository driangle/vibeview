import type { SessionInsights } from '../../../types';
import { CopyButton, LocateButton, SidebarSection } from '../../SidebarSection';
import type { InsightsActions } from '../actions';

/**
 * Git worktrees created in the session: name / branch / path with a copy-path and
 * a tab-aware locate button.
 */
export function WorktreesSection({
  worktrees,
  actions,
}: {
  worktrees: SessionInsights['worktrees'];
  actions: InsightsActions;
}) {
  if (worktrees.length === 0) return null;

  return (
    <SidebarSection id="worktrees" icon="account_tree" title="Worktrees" count={worktrees.length}>
      <div className="space-y-1.5">
        {worktrees.map((wt, i) => (
          <div
            key={i}
            className="px-2.5 py-2 bg-card border border-border rounded-md flex items-start gap-1.5 group"
          >
            <div className="flex-1 min-w-0">
              <span className="text-xs font-medium text-fg">{wt.name}</span>
              {wt.branch && (
                <p className="text-[10px] text-muted-fg font-mono truncate">{wt.branch}</p>
              )}
              {wt.path && <p className="text-[10px] text-muted-fg font-mono truncate">{wt.path}</p>}
            </div>
            {wt.path && <CopyButton text={wt.path} />}
            <LocateButton
              onClick={() => actions.onEntity({ query: '', messageUuid: wt.messageUuid })}
            />
          </div>
        ))}
      </div>
    </SidebarSection>
  );
}
