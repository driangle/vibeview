import { useCallback, useState } from 'react';
import type { ContentBlock, SessionInsights, TimelineResponse } from '../../types';
import { FileViewer } from '../FileViewer';
import type { FileOperation } from '../FileViewer';
import { RawSessionFile } from '../RawSessionFile';
import type { RawFileView } from '../RawSessionFile';
import { SessionMetadata } from '../SessionMetadata';
import { SubagentsSummary } from '../SubagentsSummary';
import type { InsightsActions } from './actions';
import { OverviewSection } from './sections/OverviewSection';
import { ModelsSection } from './sections/ModelsSection';
import { FilesSection } from './sections/FilesSection';
import { ToolsSection } from './sections/ToolsSection';
import { CommandsSection } from './sections/CommandsSection';
import { SkillsSection } from './sections/SkillsSection';
import { ErrorsSection } from './sections/ErrorsSection';
import { WorktreesSection } from './sections/WorktreesSection';

interface SessionInsightsSidebarProps {
  /** Session-level insights (complete, navigational). Null while loading a subagent. */
  insights: SessionInsights | null;
  /** Timeline aggregate for the Overview/Models sections. Null in subagent view. */
  timeline: TimelineResponse | null;
  /** Tab-aware interactions, built by SessionView for the active tab. */
  actions: InsightsActions;
  toolResults: Map<string, ContentBlock>;
  filePath?: string;
  project: string;
  model: string;
  timestamp: string;
  sessionId: string;
  isSubagentView: boolean;
  subagentLoading?: boolean;
  onFocusAgent?: (agentId: string) => void;
}

/**
 * The single "Session Insights" sidebar, identical on both tabs. Every section is
 * a collapsible {@link ../SidebarSection}. Timeline-derived sections (Overview,
 * Models) render only when a timeline is present; the rest come from the session
 * insights. All navigation goes through the tab-aware `actions`; opening the file
 * viewer and focusing a subagent stay local (tab-independent).
 */
export function SessionInsightsSidebar({
  insights,
  timeline,
  actions,
  toolResults,
  filePath,
  project,
  model,
  timestamp,
  sessionId,
  isSubagentView,
  subagentLoading,
  onFocusAgent,
}: SessionInsightsSidebarProps) {
  const [viewerFile, setViewerFile] = useState<RawFileView | null>(null);

  const handleFileClick = useCallback((path: string, operations: FileOperation[]) => {
    setViewerFile({ path, operations });
  }, []);

  const handleCommandClick = useCallback((command: string, output: string | null) => {
    const content = output ? `$ ${command}\n\n${output}` : `$ ${command}`;
    setViewerFile({
      path: 'Command',
      operations: [{ type: 'read', content, timestamp: '' }],
      showOperationMeta: false,
    });
  }, []);

  const locate = useCallback(
    (uuid: string) => actions.onEntity({ query: '', messageUuid: uuid }),
    [actions],
  );

  return (
    <aside className="w-full lg:w-96 shrink-0 bg-surface-dim p-4 sm:p-6 overflow-y-auto print:hidden">
      <div className="space-y-8">
        {isSubagentView && (
          <div className="flex items-center gap-2 rounded-md border border-info/25 bg-info/5 px-3 py-2">
            <span className="material-symbols-outlined text-info text-sm">smart_toy</span>
            <span className="text-[11px] font-headline font-bold uppercase tracking-widest text-info">
              Agent session
            </span>
          </div>
        )}

        {isSubagentView && subagentLoading && (
          <p className="text-muted-fg text-xs">Loading agent data...</p>
        )}

        {timeline && <OverviewSection timeline={timeline} actions={actions} />}
        {timeline && <ModelsSection insights={timeline.insights} actions={actions} />}

        {filePath && (
          <RawSessionFile filePath={filePath} sessionId={sessionId} onOpen={setViewerFile} />
        )}
        {insights && (
          <FilesSection files={insights.files} onFileClick={handleFileClick} actions={actions} />
        )}
        {insights && <ToolsSection tools={insights.tools} actions={actions} />}
        {insights && !isSubagentView && (
          <SkillsSection skills={insights.skills} actions={actions} />
        )}
        {insights && (
          <CommandsSection
            commands={insights.commands}
            toolResults={toolResults}
            onCommandClick={handleCommandClick}
            actions={actions}
          />
        )}
        {insights && <ErrorsSection errors={insights.errors} actions={actions} />}
        {insights && (
          <SubagentsSummary
            subagents={insights.subagents}
            onNavigateToMessage={locate}
            onFocusAgent={onFocusAgent}
          />
        )}
        {insights && !isSubagentView && (
          <WorktreesSection worktrees={insights.worktrees} actions={actions} />
        )}
        {!isSubagentView && (
          <SessionMetadata
            project={project}
            model={model}
            timestamp={timestamp}
            sessionId={sessionId}
          />
        )}
      </div>

      {viewerFile && (
        <FileViewer
          filePath={viewerFile.path}
          operations={viewerFile.operations}
          plain={viewerFile.plain}
          showOperationMeta={viewerFile.showOperationMeta}
          showCopy={viewerFile.showCopy}
          onClose={() => setViewerFile(null)}
        />
      )}
    </aside>
  );
}
