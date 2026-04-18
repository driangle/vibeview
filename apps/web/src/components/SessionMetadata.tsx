import { Link, useSearchParams } from 'react-router-dom';
import { CopyableText } from './CopyableText';
import { DirectoryName } from './DirectoryName';
import { SidebarSection } from './SidebarSection';
import { formatDate } from '../utils';

interface SessionMetadataProps {
  project: string;
  model: string;
  timestamp: string;
  sessionId: string;
}

export function SessionMetadata({ project, model, timestamp, sessionId }: SessionMetadataProps) {
  const [searchParams] = useSearchParams();
  const activeProjectId = searchParams.get('project') || '';

  return (
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
  );
}
