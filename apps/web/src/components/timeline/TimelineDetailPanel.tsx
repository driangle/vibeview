import { useState, useCallback, useRef } from 'react';
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

function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`;
  if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(1)}k`;
  return String(tokens);
}

function PhaseSummary({ phase, cycles }: { phase: TimelinePhase; cycles: TimelineCycle[] }) {
  const theme = getPhaseTheme(phase.phase);
  const phaseCycles = cycles.slice(phase.startCycleIndex, phase.endCycleIndex + 1);
  const totalDuration = phaseCycles.reduce((sum, c) => sum + c.durationMs, 0);
  const totalTokens = phaseCycles.reduce((sum, c) => sum + c.totalTokens, 0);

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
        <div className="rounded-lg bg-fg/8 p-2">
          <div className="text-lg font-semibold text-fg">{phaseCycles.length}</div>
          <div className="text-xs text-fg/60">cycles</div>
        </div>
        <div className="rounded-lg bg-fg/8 p-2">
          <div className="text-lg font-semibold text-fg">{formatTokens(totalTokens)}</div>
          <div className="text-xs text-fg/60">tokens</div>
        </div>
        <div className="rounded-lg bg-fg/8 p-2">
          <div className="text-lg font-semibold text-fg">{formatDuration(totalDuration)}</div>
          <div className="text-xs text-fg/60">duration</div>
        </div>
      </div>

      {sortedTools.length > 0 && (
        <div>
          <h4 className="mb-2 text-xs font-medium text-fg/60">Tool usage</h4>
          <div className="flex flex-wrap gap-2">
            {sortedTools.map(([tool, count]) => (
              <span key={tool} className="rounded-full bg-fg/10 px-2.5 py-1 text-xs text-fg">
                {tool} <span className="text-fg/50">{count}x</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const MIN_WIDTH = 280;
const MAX_WIDTH = 800;
const DEFAULT_WIDTH = 384;

export function TimelineDetailPanel(props: TimelineDetailPanelProps) {
  const { onClose } = props;
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const dragRef = useRef<{ startX: number; startWidth: number } | null>(null);

  const handleDragStart = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      dragRef.current = { startX: e.clientX, startWidth: width };
      const target = e.currentTarget as Element;
      target.setPointerCapture(e.pointerId);
    },
    [width],
  );

  const handleDrag = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const delta = dragRef.current.startX - e.clientX;
    setWidth(Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, dragRef.current.startWidth + delta)));
  }, []);

  const handleDragEnd = useCallback(() => {
    dragRef.current = null;
  }, []);

  return (
    <div className="relative flex h-full flex-col border-l border-fg/10 bg-bg" style={{ width }}>
      {/* Resize handle */}
      <div
        className="absolute top-0 -left-1 z-10 flex h-full w-2 cursor-col-resize items-center justify-center hover:bg-primary/10 active:bg-primary/20"
        onPointerDown={handleDragStart}
        onPointerMove={handleDrag}
        onPointerUp={handleDragEnd}
      >
        <div className="h-8 w-0.5 rounded-full bg-fg/20" />
      </div>

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
            {/* Render assistant messages */}
            {props.cycle.assistantMessages.map((msg) => (
              <MessageBubble
                key={msg.uuid}
                message={msg}
                toolResults={props.toolResults}
                agentGroups={props.agentGroups}
                agentGroupFirstIds={props.agentGroupFirstIds}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
