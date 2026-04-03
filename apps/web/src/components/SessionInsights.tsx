import { useState } from 'react';
import type { ContentBlock, SessionInsights } from '../types';
import { resolveResultText } from '../lib/extractors';

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-muted-fg hover:text-fg transition-all shrink-0"
      title="Copy path"
    >
      <span className="material-symbols-outlined text-[10px]">
        {copied ? 'check' : 'content_copy'}
      </span>
    </button>
  );
}

export function LocateButton({ onClick }: { onClick: (e: React.MouseEvent) => void }) {
  return (
    <button
      onClick={onClick}
      className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-muted-fg hover:text-primary transition-all shrink-0"
      title="Locate in conversation"
    >
      <span
        className="material-symbols-outlined"
        style={{ fontSize: 14, fontVariationSettings: "'opsz' 14" }}
      >
        my_location
      </span>
    </button>
  );
}

function useCollapsed(key: string, defaultValue = true): [boolean, () => void] {
  const storageKey = `sidebar-collapsed:${key}`;
  const [collapsed, setCollapsed] = useState(() => {
    const stored = localStorage.getItem(storageKey);
    return stored !== null ? stored === 'true' : defaultValue;
  });
  const toggle = () => {
    setCollapsed((prev) => {
      localStorage.setItem(storageKey, String(!prev));
      return !prev;
    });
  };
  return [collapsed, toggle];
}

export function SidebarSection({
  id,
  icon,
  title,
  count,
  defaultCollapsed = true,
  children,
}: {
  id: string;
  icon: string;
  title: string;
  count?: number;
  defaultCollapsed?: boolean;
  children: React.ReactNode;
}) {
  const [collapsed, toggle] = useCollapsed(id, defaultCollapsed);

  return (
    <div>
      <button
        onClick={toggle}
        className="w-full flex items-center gap-2 font-headline text-[11px] font-bold uppercase tracking-widest text-muted-fg mb-2 hover:text-fg transition-colors"
      >
        <span className="material-symbols-outlined text-sm">{icon}</span>
        {title}
        {count != null && (
          <span className="text-[10px] font-medium text-muted-fg bg-muted px-1.5 py-0.5 rounded">
            {count}
          </span>
        )}
        <span
          className="material-symbols-outlined text-xs ml-auto transition-transform duration-150"
          style={{ transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}
        >
          expand_more
        </span>
      </button>
      {!collapsed && <div className="mt-2">{children}</div>}
    </div>
  );
}

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

type SubagentEntry = SessionInsights['subagents'][number];

function AgentCard({
  agent,
  onNavigateToMessage,
  onFocusAgent,
}: {
  agent: SubagentEntry;
  onNavigateToMessage: (uuid: string) => void;
  onFocusAgent?: (agentId: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const prompt = agent.prompt || 'Agent';
  const preview = prompt.length > 80 ? prompt.slice(0, 80) + '...' : prompt;
  const turnCount = agent.source === 'agent_progress' ? (agent.turnCount ?? 1) : 1;

  return (
    <div className="bg-card border border-border rounded-md overflow-hidden group">
      <div className="flex items-start gap-1">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex-1 min-w-0 px-2.5 py-2 text-left hover:bg-bg transition-colors"
        >
          <div className="flex items-center gap-1.5 mb-0.5">
            {agent.agentType && (
              <span className="shrink-0 rounded bg-info/15 px-1.5 py-0.5 text-[10px] font-headline uppercase tracking-wide text-info">
                {agent.agentType}
              </span>
            )}
            <span className="text-[10px] text-muted-fg truncate">
              {agent.source === 'agent_progress'
                ? `${turnCount} turn${turnCount !== 1 ? 's' : ''}`
                : agent.description || 'background agent'}
            </span>
          </div>
          <p className="text-[11px] text-fg line-clamp-2">{preview}</p>
        </button>
        <div className="pt-2 pr-1 flex items-center gap-0.5">
          {onFocusAgent && !agent.agentId.startsWith('tool_use_') && (
            <button
              onClick={() => onFocusAgent(agent.agentId)}
              className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-muted-fg hover:text-info transition-all shrink-0"
              title="View full conversation"
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: 14, fontVariationSettings: "'opsz' 14" }}
              >
                open_in_full
              </span>
            </button>
          )}
          <LocateButton onClick={() => onNavigateToMessage(agent.firstMessageUuid)} />
        </div>
      </div>
      {expanded && (
        <div className="border-t border-border px-2.5 py-2 max-h-64 overflow-y-auto">
          <div className="mb-2">
            <div className="text-[10px] font-headline font-bold text-muted-fg uppercase mb-1">
              Prompt
            </div>
            <pre className="whitespace-pre-wrap rounded bg-bg p-2 text-[11px] text-fg">
              {prompt}
            </pre>
          </div>
          <div className="text-[10px] font-headline font-bold text-muted-fg uppercase mb-1">
            Agent ID
          </div>
          <span className="text-[10px] text-muted-fg font-mono">{agent.agentId}</span>
        </div>
      )}
    </div>
  );
}

export function SubagentsSummary({
  subagents,
  onNavigateToMessage,
  onFocusAgent,
}: {
  subagents: SessionInsights['subagents'];
  onNavigateToMessage: (uuid: string) => void;
  onFocusAgent?: (agentId: string) => void;
}) {
  if (subagents.length === 0) return null;

  const turnCounts = subagents.map((a) => (a.source === 'agent_progress' ? (a.turnCount ?? 1) : 1));
  const totalTurns = turnCounts.reduce((s, c) => s + c, 0);
  const sorted = [...turnCounts].sort((a, b) => a - b);
  const medianTurns =
    sorted.length % 2 === 0
      ? ((sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2).toFixed(1)
      : sorted[Math.floor(sorted.length / 2)];

  return (
    <SidebarSection id="subagents" icon="groups" title="Subagents" count={subagents.length}>
      <div className="flex justify-center gap-6 mb-3">
        <div className="flex flex-col items-center">
          <span className="text-[10px] text-muted-fg font-headline uppercase">Total turns</span>
          <span className="text-sm font-medium text-fg">{totalTurns}</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-[10px] text-muted-fg font-headline uppercase">Median</span>
          <span className="text-sm font-medium text-fg">{medianTurns}</span>
        </div>
      </div>
      <div className="space-y-1.5">
        {subagents.map((agent) => (
          <AgentCard
            key={agent.agentId}
            agent={agent}
            onNavigateToMessage={onNavigateToMessage}
            onFocusAgent={onFocusAgent}
          />
        ))}
      </div>
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
