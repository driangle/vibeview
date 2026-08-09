import type { SessionInsights } from '../../../types';
import { SidebarSection } from '../../SidebarSection';
import type { InsightsActions } from '../actions';

/**
 * Tool mix: one chip per tool with its use count. Clicking a chip runs the
 * tab-aware entity action (tools have no message, so on the Conversation tab this
 * falls back to filtering the Timeline).
 */
export function ToolsSection({
  tools,
  actions,
}: {
  tools: SessionInsights['tools'];
  actions: InsightsActions;
}) {
  if (tools.length === 0) return null;

  return (
    <SidebarSection
      id="tool-usage"
      icon="build"
      title="Tools"
      count={tools.reduce((s, t) => s + t.count, 0)}
    >
      <div className="flex flex-wrap gap-1.5">
        {tools.map(({ name, count }) => (
          <button
            key={name}
            type="button"
            onClick={() => actions.onEntity({ query: name })}
            className="flex items-center gap-1.5 rounded-full bg-secondary px-1.5 py-0.5 font-mono text-[10px] text-secondary-fg hover:bg-primary/15"
          >
            {name}
            <span className="text-muted-fg">{count}</span>
          </button>
        ))}
      </div>
    </SidebarSection>
  );
}
