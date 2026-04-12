import { useState } from 'react';
import type { ContentBlock, SessionInsights } from '../types';
import { resolveResultText } from '../lib/extractors';
import { CopyButton, LocateButton, SidebarSection } from './SidebarSection';

export { LocateButton, SidebarSection } from './SidebarSection';
export { SubagentsSummary } from './SubagentsSummary';

export function ToolUsageSummary({ tools }: { tools: SessionInsights['tools'] }) {
  const toolCounts = tools;

  if (toolCounts.length === 0) return null;

  return (
    <SidebarSection
      id="tool-usage"
      icon="build"
      title="Tool Usage"
      count={toolCounts.reduce((s, t) => s + t.count, 0)}
    >
      <div className="flex flex-wrap gap-1.5">
        {toolCounts.map(({ name, count }) => (
          <span
            key={name}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-fg bg-card border border-border rounded-md px-2 py-1"
          >
            {name}
            <span className="text-muted-fg">&times;{count}</span>
          </span>
        ))}
      </div>
    </SidebarSection>
  );
}

export function SkillsSummary({
  skills,
  onNavigateToMessage,
}: {
  skills: SessionInsights['skills'];
  onNavigateToMessage: (uuid: string) => void;
}) {
  if (skills.length === 0) return null;

  const total = skills.reduce((s, t) => s + t.count, 0);

  return (
    <SidebarSection id="skills" icon="magic_button" title="Skills" count={total}>
      <div className="space-y-1">
        {skills.map(({ name, count, messageUuid }) => (
          <div key={name} className="flex items-center gap-1 group">
            <span className="flex-1 min-w-0 inline-flex items-center gap-1 text-[11px] font-medium text-fg bg-card border border-border rounded-md px-2.5 py-1.5 truncate">
              /{name}
              {count > 1 && <span className="text-muted-fg">&times;{count}</span>}
            </span>
            <LocateButton onClick={() => onNavigateToMessage(messageUuid)} />
          </div>
        ))}
      </div>
    </SidebarSection>
  );
}

export function BashCommandsList({
  commands,
  toolResults,
  onCommandClick,
  onNavigateToMessage,
}: {
  commands: SessionInsights['commands'];
  toolResults: Map<string, ContentBlock>;
  onCommandClick: (command: string, output: string | null) => void;
  onNavigateToMessage: (uuid: string) => void;
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
            <LocateButton onClick={() => onNavigateToMessage(entry.messageUuid)} />
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

export function ErrorsSummary({
  errors,
  onNavigateToMessage,
}: {
  errors: SessionInsights['errors'];
  onNavigateToMessage: (uuid: string) => void;
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
            <LocateButton onClick={() => onNavigateToMessage(err.messageUuid)} />
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

export function WorktreesSummary({
  worktrees,
  onNavigateToMessage,
}: {
  worktrees: SessionInsights['worktrees'];
  onNavigateToMessage: (uuid: string) => void;
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
            <LocateButton onClick={() => onNavigateToMessage(wt.messageUuid)} />
          </div>
        ))}
      </div>
    </SidebarSection>
  );
}
