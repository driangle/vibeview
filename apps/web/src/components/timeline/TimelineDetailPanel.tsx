import type { TimelineCycle, TimelinePhase } from '../../lib/timeline/types';
import type { ContentBlock } from '../../types';
import { getPhaseTheme } from '../../lib/timeline/phaseTheme';
import { MessageBubble } from '../MessageBubble';

interface CycleDetailProps {
  type: 'cycle';
  cycle: TimelineCycle;
  toolResults: Map<string, ContentBlock>;
  agentGroups: Map<string, import('../../types').MessageResponse[]>;
  agentGroupFirstIds: Set<string>;
}

interface PhaseDetailProps {
  type: 'phase';
  phase: TimelinePhase;
  cycles: TimelineCycle[];
}

type TimelineDetailPanelProps = {
  onClose: () => void;
} & (CycleDetailProps | PhaseDetailProps);

function formatDuration(ms: number): string {
  if (ms < 1000) return '<1s';
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m`;
}

function formatCost(usd: number): string {
  if (usd === 0) return '$0.00';
  return `$${usd.toFixed(2)}`;
}

function PhaseSummary({ phase, cycles }: { phase: TimelinePhase; cycles: TimelineCycle[] }) {
  const theme = getPhaseTheme(phase.phase);
  const phaseCycles = cycles.slice(phase.startCycleIndex, phase.endCycleIndex + 1);
  const totalCost = phaseCycles.reduce((sum, c) => sum + c.costUSD, 0);
  const totalDuration = phaseCycles.reduce((sum, c) => sum + c.durationMs, 0);

  // Tool breakdown
  const toolCounts = new Map<string, number>();
  for (const c of phaseCycles) {
    for (const tool of c.features.toolNames) {
      toolCounts.set(tool, (toolCounts.get(tool) ?? 0) + 1);
    }
  }
  const sortedTools = [...toolCounts.entries()].sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span
          className="inline-block h-3 w-3 rounded-full"
          style={{ backgroundColor: theme.fill }}
        />
        <h3 className="text-lg font-semibold text-fg">{theme.label}</h3>
      </div>

      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="rounded-lg bg-secondary/10 p-2">
          <div className="text-lg font-semibold text-fg">{phaseCycles.length}</div>
          <div className="text-xs text-secondary">cycles</div>
        </div>
        <div className="rounded-lg bg-secondary/10 p-2">
          <div className="text-lg font-semibold text-fg">{formatCost(totalCost)}</div>
          <div className="text-xs text-secondary">cost</div>
        </div>
        <div className="rounded-lg bg-secondary/10 p-2">
          <div className="text-lg font-semibold text-fg">{formatDuration(totalDuration)}</div>
          <div className="text-xs text-secondary">duration</div>
        </div>
      </div>

      {sortedTools.length > 0 && (
        <div>
          <h4 className="mb-2 text-xs font-medium text-secondary">Tool usage</h4>
          <div className="flex flex-wrap gap-2">
            {sortedTools.map(([tool, count]) => (
              <span key={tool} className="rounded-full bg-secondary/15 px-2.5 py-1 text-xs text-fg">
                {tool} <span className="text-secondary">{count}x</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function TimelineDetailPanel(props: TimelineDetailPanelProps) {
  const { onClose } = props;

  return (
    <div className="flex h-full w-80 flex-col border-l border-fg/10 bg-bg lg:w-96">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-fg/10 px-4 py-3">
        <h2 className="text-sm font-semibold text-fg">
          {props.type === 'cycle' ? 'Exchange Detail' : 'Phase Summary'}
        </h2>
        <button
          onClick={onClose}
          className="rounded p-1 text-secondary hover:bg-secondary/20 hover:text-fg"
          title="Close (Esc)"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="h-4 w-4"
          >
            <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {props.type === 'phase' ? (
          <PhaseSummary phase={props.phase} cycles={props.cycles} />
        ) : (
          <div className="space-y-3">
            {/* Render user message */}
            {props.cycle.userMessage && (
              <MessageBubble
                message={props.cycle.userMessage}
                toolResults={props.toolResults}
                agentGroups={props.agentGroups}
                agentGroupFirstIds={props.agentGroupFirstIds}
              />
            )}
            {/* Render assistant message */}
            {props.cycle.assistantMessage && (
              <MessageBubble
                message={props.cycle.assistantMessage}
                toolResults={props.toolResults}
                agentGroups={props.agentGroups}
                agentGroupFirstIds={props.agentGroupFirstIds}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
