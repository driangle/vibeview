import { useState } from 'react';
import type { ContentBlock, SessionInsights } from '../../../types';
import { resolveResultText } from '../../../lib/extractors';
import { SidebarSection, LocateButton } from '../../SidebarSection';
import type { InsightsActions } from '../actions';

/**
 * Commands run in the session: each opens its output in the viewer, with a
 * tab-aware locate button. Shows the first five, then expands.
 */
export function CommandsSection({
  commands,
  toolResults,
  onCommandClick,
  actions,
}: {
  commands: SessionInsights['commands'];
  toolResults: Map<string, ContentBlock>;
  onCommandClick: (command: string, output: string | null) => void;
  actions: InsightsActions;
}) {
  const [expanded, setExpanded] = useState(false);

  if (commands.length === 0) return null;

  const visible = expanded ? commands : commands.slice(0, 5);

  return (
    <SidebarSection id="commands" icon="terminal" title="Commands" count={commands.length}>
      <div className="space-y-1 max-h-48 overflow-y-auto">
        {visible.map((entry, i) => (
          <div key={i} className="flex items-center gap-1 group">
            <button
              title={entry.command}
              onClick={() => {
                const output = resolveResultText(toolResults.get(entry.toolUseId));
                onCommandClick(entry.command, output);
              }}
              className="flex-1 min-w-0 px-2.5 py-1.5 bg-card border border-border rounded-md font-mono text-[11px] text-fg truncate text-left hover:bg-bg transition-colors cursor-pointer"
            >
              <span className="text-muted-fg mr-1">$</span>
              {entry.command.length > 80 ? entry.command.slice(0, 80) + '...' : entry.command}
            </button>
            <LocateButton
              onClick={() =>
                actions.onEntity({ query: entry.command, messageUuid: entry.messageUuid })
              }
            />
          </div>
        ))}
      </div>
      {commands.length > 5 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-2 text-[10px] font-headline uppercase tracking-wide text-muted-fg hover:text-fg transition-colors"
        >
          {expanded ? 'Show less' : `Show all ${commands.length}`}
        </button>
      )}
    </SidebarSection>
  );
}
