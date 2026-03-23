import { useMemo, useState, useCallback, useEffect } from 'react';
import type { MessageResponse, ContentBlock } from '../../types';
import type { TimelineCycle, TimelinePhase as TPhase } from '../../lib/timeline/types';
import { buildTimeline } from '../../lib/timeline/buildTimeline';
import { SessionTimeline } from './SessionTimeline';
import { TimelinePhaseRegion } from './TimelinePhaseRegion';
import { TimelineConnectionPath } from './TimelineConnectionPath';
import { TimelineNode } from './TimelineNode';
import { TimelineToolLane } from './TimelineToolLane';
import { TimelineTooltip } from './TimelineTooltip';
import { TimelineDetailPanel } from './TimelineDetailPanel';

interface TimelineViewProps {
  messages: MessageResponse[];
  toolResults: Map<string, ContentBlock>;
  agentGroups: Map<string, MessageResponse[]>;
  agentGroupFirstIds: Set<string>;
}

export function TimelineView({
  messages,
  toolResults,
  agentGroups,
  agentGroupFirstIds,
}: TimelineViewProps) {
  const timeline = useMemo(() => buildTimeline(messages), [messages]);
  const { cycles, phases, layout } = timeline;

  const [hoveredCycle, setHoveredCycle] = useState<TimelineCycle | null>(null);
  const [glyphTooltip, setGlyphTooltip] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const [selectedCycle, setSelectedCycle] = useState<TimelineCycle | null>(null);
  const [selectedPhase, setSelectedPhase] = useState<TPhase | null>(null);

  const handleNodeHover = useCallback(
    (cycle: TimelineCycle | null, e?: React.PointerEvent<SVGGElement>) => {
      setHoveredCycle(cycle);
      setGlyphTooltip(null);
      if (cycle && e) {
        setTooltipPos({ x: e.clientX, y: e.clientY });
      } else {
        setTooltipPos(null);
      }
    },
    [],
  );

  const handleGlyphHover = useCallback(
    (summary: string | null, e?: React.PointerEvent<SVGGElement>) => {
      setGlyphTooltip(summary);
      setHoveredCycle(null);
      if (summary && e) {
        setTooltipPos({ x: e.clientX, y: e.clientY });
      } else {
        setTooltipPos(null);
      }
    },
    [],
  );

  const handleNodeClick = useCallback((cycle: TimelineCycle) => {
    setSelectedCycle(cycle);
    setSelectedPhase(null);
  }, []);

  const handlePhaseClick = useCallback((phase: TPhase) => {
    setSelectedPhase(phase);
    setSelectedCycle(null);
  }, []);

  const handleClosePanel = useCallback(() => {
    setSelectedCycle(null);
    setSelectedPhase(null);
  }, []);

  // Escape key closes panel
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClosePanel();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [handleClosePanel]);

  if (cycles.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center text-secondary">
        <p>No messages to display</p>
      </div>
    );
  }

  const showPanel = selectedCycle !== null || selectedPhase !== null;

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Timeline */}
      <SessionTimeline
        contentWidth={layout.totalWidth}
        contentHeight={layout.config.viewportHeight}
      >
        {/* Phase regions (bottom layer) */}
        {phases.map((phase, i) => (
          <TimelinePhaseRegion
            key={i}
            phase={phase}
            layout={layout.phaseRegions[i]}
            isHighlighted={selectedPhase?.startCycleIndex === phase.startCycleIndex}
            onClick={handlePhaseClick}
          />
        ))}

        {/* Connection path */}
        <TimelineConnectionPath nodes={layout.nodes} />

        {/* Tool activity lane */}
        <TimelineToolLane
          cycles={cycles}
          nodeLayouts={layout.nodes}
          config={layout.config}
          onGlyphHover={handleGlyphHover}
        />

        {/* Nodes (top layer) */}
        {cycles.map((cycle, i) => (
          <TimelineNode
            key={cycle.index}
            cycle={cycle}
            layout={layout.nodes[i]}
            isSelected={selectedCycle?.index === cycle.index}
            onHover={handleNodeHover}
            onClick={handleNodeClick}
          />
        ))}
      </SessionTimeline>

      {/* Detail panel */}
      {showPanel && selectedCycle && (
        <TimelineDetailPanel
          type="cycle"
          cycle={selectedCycle}
          toolResults={toolResults}
          agentGroups={agentGroups}
          agentGroupFirstIds={agentGroupFirstIds}
          onClose={handleClosePanel}
        />
      )}
      {showPanel && selectedPhase && (
        <TimelineDetailPanel
          type="phase"
          phase={selectedPhase}
          cycles={cycles}
          onClose={handleClosePanel}
        />
      )}

      {/* Tooltips */}
      {hoveredCycle && tooltipPos && <TimelineTooltip cycle={hoveredCycle} position={tooltipPos} />}
      {glyphTooltip && tooltipPos && (
        <div
          className="pointer-events-none fixed z-50 max-w-[300px] rounded-lg bg-card px-3 py-2 text-xs text-fg shadow-lg ring-1 ring-fg/10"
          style={{ left: tooltipPos.x, top: tooltipPos.y - 8, transform: 'translate(-50%, -100%)' }}
        >
          {glyphTooltip}
        </div>
      )}
    </div>
  );
}
