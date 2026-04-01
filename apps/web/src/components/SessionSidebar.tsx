import { useState, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CopyableText } from './CopyableText';
import {
  SidebarSection,
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
import { DirectoryName } from './DirectoryName';
import type { ContentBlock, SessionInsights } from '../types';
import { formatDate } from '../utils';

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
}: SessionSidebarProps) {
  const isSubagentView = Boolean(focusedAgentId);
  const [searchParams] = useSearchParams();
  const activeProjectId = searchParams.get('project') || '';
  const [viewerFile, setViewerFile] = useState<{
    path: string;
    operations: FileOperation[];
  } | null>(null);

  const handleFileClick = useCallback((path: string, operations: FileOperation[]) => {
    setViewerFile({ path, operations });
  }, []);

  const handleCommandClick = useCallback((command: string, output: string | null) => {
    const content = output ? `$ ${command}\n\n${output}` : `$ ${command}`;
    setViewerFile({ path: 'Command', operations: [{ type: 'read', content, timestamp: '' }] });
  }, []);

  const handleCopyPath = useCallback(async (e: React.MouseEvent, path: string) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(path);
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

        {/* Raw Session File */}
        {filePath && (
          <SidebarSection id="raw-session-file" icon="attach_file" title="Raw Session File">
            <button
              onClick={() => handleFileClick(filePath, [])}
              className="w-full p-3 bg-card border border-border rounded-lg flex items-center gap-3 hover:bg-bg transition-colors cursor-pointer group text-left"
            >
              <span className="material-symbols-outlined text-primary group-hover:scale-110 transition-transform">
                description
              </span>
              <div className="flex flex-col overflow-hidden flex-1 min-w-0">
                <span className="text-xs font-medium text-fg truncate">
                  {filePath.split('/').pop()}
                </span>
                <span className="text-[10px] text-muted-fg font-mono truncate">{filePath}</span>
              </div>
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => handleCopyPath(e, filePath)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    e.stopPropagation();
                    navigator.clipboard.writeText(filePath);
                  }
                }}
                className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-muted-fg hover:text-fg transition-all shrink-0"
                title="Copy path"
              >
                <span className="material-symbols-outlined text-xs">content_copy</span>
              </span>
            </button>
          </SidebarSection>
        )}

        {/* Files Touched */}
        {insights && (
          <FilesTouched
            files={insights.files}
            toolResults={toolResults}
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
          <SidebarSection id="metadata" icon="info" title="Metadata">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-headline text-muted-fg uppercase">Project</span>
                <Link
                  to={`/?dir=${encodeURIComponent(project)}${activeProjectId ? `&project=${encodeURIComponent(activeProjectId)}` : ''}`}
                  className="text-xs font-medium text-fg hover:text-primary transition-colors"
                >
                  <DirectoryName dir={project} />
                </Link>
              </div>
              {model && (
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-headline text-muted-fg uppercase">Model</span>
                  <span className="text-xs font-medium px-1.5 py-0.5 bg-muted rounded font-mono">
                    {model}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-headline text-muted-fg uppercase">Started</span>
                <span className="text-xs font-medium text-fg">{formatDate(timestamp)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-headline text-muted-fg uppercase">Session</span>
                <CopyableText
                  text={sessionId}
                  className="text-xs font-medium text-fg font-mono max-w-[140px] truncate"
                />
              </div>
            </div>
          </SidebarSection>
        )}
      </div>

      {viewerFile && (
        <FileViewer
          filePath={viewerFile.path}
          operations={viewerFile.operations}
          onClose={() => setViewerFile(null)}
        />
      )}
    </aside>
  );
}
