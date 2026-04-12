import { useState } from 'react';
import type { SessionInsights } from '../types';
import { LocateButton, SidebarSection } from './SidebarSection';

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
