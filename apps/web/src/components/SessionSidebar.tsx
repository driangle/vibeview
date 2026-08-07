import { useState, useCallback } from 'react';
import {
  ToolUsageSummary,
  SkillsSummary,
  BashCommandsList,
  ErrorsSummary,
  SubagentsSummary,
  WorktreesSummary,
} from './SessionInsights';
import { FilesTouched } from './FilesTouched';
import { FileViewer } from './FileViewer';
import type { FileOperation } from './FileViewer';
import { RawSessionFile } from './RawSessionFile';
import type { RawFileView } from './RawSessionFile';
import { SessionMetadata } from './SessionMetadata';
import type { ContentBlock, SessionInsights } from '../types';

interface SessionSidebarProps {
  filePath?: string;
  project: string;
  model: string;
  timestamp: string;
  sessionId: string;
  insights: SessionInsights | null;
  toolResults: Map<string, ContentBlock>;
  onNavigateToMessage: (uuid: string) => void;
  onFocusAgent?: (agentId: string) => void;
  focusedAgentId?: string | null;
  subagentLoading?: boolean;
}

export function SessionSidebar({
  filePath,
  project,
  model,
  timestamp,
  sessionId,
  insights,
  toolResults,
  onNavigateToMessage,
  onFocusAgent,
  focusedAgentId,
  subagentLoading,
}: SessionSidebarProps) {
  const isSubagentView = Boolean(focusedAgentId);
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

  return (
    <aside className="w-full lg:w-80 shrink-0 bg-surface-dim p-4 sm:p-6 overflow-y-auto print:hidden">
      <div className="space-y-8">
        {/* Subagent indicator */}
        {isSubagentView && (
          <div className="flex items-center gap-2 rounded-md border border-info/25 bg-info/5 px-3 py-2">
            <span className="material-symbols-outlined text-info text-sm">smart_toy</span>
            <span className="text-[11px] font-headline font-bold uppercase tracking-widest text-info">
              Agent session
            </span>
          </div>
        )}

        {/* Subagent loading state */}
        {isSubagentView && subagentLoading && (
          <p className="text-muted-fg text-xs">Loading agent data...</p>
        )}

        {/* Raw Session File */}
        {filePath && (
          <RawSessionFile filePath={filePath} sessionId={sessionId} onOpen={setViewerFile} />
        )}

        {/* Files Touched */}
        {insights && (
          <FilesTouched
            files={insights.files}
            onFileClick={handleFileClick}
            onNavigateToMessage={onNavigateToMessage}
          />
        )}

        {/* Tool Usage */}
        {insights && <ToolUsageSummary tools={insights.tools} />}

        {/* Skills */}
        {insights && !isSubagentView && (
          <SkillsSummary skills={insights.skills} onNavigateToMessage={onNavigateToMessage} />
        )}

        {/* Bash Commands */}
        {insights && (
          <BashCommandsList
            commands={insights.commands}
            toolResults={toolResults}
            onCommandClick={handleCommandClick}
            onNavigateToMessage={onNavigateToMessage}
          />
        )}

        {/* Worktrees */}
        {insights && !isSubagentView && (
          <WorktreesSummary
            worktrees={insights.worktrees}
            onNavigateToMessage={onNavigateToMessage}
          />
        )}

        {/* Subagents */}
        {insights && (
          <SubagentsSummary
            subagents={insights.subagents}
            onNavigateToMessage={onNavigateToMessage}
            onFocusAgent={onFocusAgent}
          />
        )}

        {/* Errors */}
        {insights && (
          <ErrorsSummary errors={insights.errors} onNavigateToMessage={onNavigateToMessage} />
        )}

        {/* Metadata */}
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
