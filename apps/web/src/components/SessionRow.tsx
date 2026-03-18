import { Link, useNavigate } from "react-router-dom";
import { ModelBadge } from "./ModelBadge";
import type { Session } from "../types";
import { projectName } from "../utils";

const RECENT_THRESHOLD_MS = 5 * 60 * 1000;

function formatTokens(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}k`;
  return String(count);
}

function isRecent(timestamp: string): boolean {
  return Date.now() - new Date(timestamp).getTime() < RECENT_THRESHOLD_MS;
}

function formatSessionDate(timestamp: string): { date: string; relative: string } {
  const d = new Date(timestamp);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const date = `${months[d.getMonth()]} ${d.getDate()}, ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

  const now = Date.now();
  const diffMs = now - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  let relative: string;
  if (diffMin < 1) relative = "just now";
  else if (diffMin < 60) relative = `${diffMin}m ago`;
  else if (diffHr < 24) relative = `${diffHr}h ago`;
  else if (diffDays < 7) relative = `${diffDays}d ago`;
  else relative = "";

  return { date, relative };
}

interface SessionRowProps {
  session: Session;
  onDirectoryClick: (dir: string) => void;
  onModelClick: (model: string) => void;
  isSelected?: boolean;
  rowIndex?: number;
}

export function SessionRow({ session, onDirectoryClick, onModelClick, isSelected, rowIndex }: SessionRowProps) {
  const navigate = useNavigate();
  const recent = isRecent(session.timestamp);
  const time = formatSessionDate(session.timestamp);

  return (
    <tr
      data-row-index={rowIndex}
      onClick={() => navigate(`/session/${session.id}`)}
      className={`border-t border-border transition-colors hover:bg-secondary/50 cursor-pointer ${isSelected ? "ring-2 ring-ring bg-primary/5" : ""}`}
    >
      {/* Session name */}
      <td className="px-4 py-3 text-sm truncate">
        <Link
          to={`/session/${session.id}`}
          onClick={(e) => e.stopPropagation()}
          className="font-medium text-fg hover:text-primary transition-colors"
        >
          {session.customTitle || session.slug || session.id}
        </Link>
      </td>

      {/* Directory */}
      <td className="px-4 py-3 text-xs truncate">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onDirectoryClick(session.project); }}
          className="cursor-pointer text-muted-fg hover:text-primary hover:underline transition-colors"
        >
          {projectName(session.project)}
        </button>
      </td>

      {/* Time */}
      <td className="px-4 py-3 whitespace-nowrap">
        <div className="text-xs text-fg font-medium">{time.date}</div>
        {time.relative && (
          <div className="text-[11px] text-muted-fg">{time.relative}</div>
        )}
      </td>

      {/* Messages */}
      <td className="px-4 py-3 text-xs text-muted-fg text-right whitespace-nowrap">
        <span className="inline-flex items-center gap-1.5">
          {recent && (
            <span className="h-2 w-2 shrink-0 rounded-full bg-success animate-pulse" title="Active recently" />
          )}
          {session.messageCount}
        </span>
      </td>

      {/* Model */}
      <td className="px-4 py-3 text-xs">
        {session.model && (
          <ModelBadge model={session.model} onClick={onModelClick} />
        )}
      </td>

      {/* Tokens (in/out) */}
      <td className="px-4 py-3 text-xs text-muted-fg text-right whitespace-nowrap">
        <div>
          <span className="text-muted-fg/70">in:</span>{" "}
          <span className="text-fg">{formatTokens(session.usage.inputTokens)}</span>
        </div>
        <div>
          <span className="text-muted-fg/70">out:</span>{" "}
          <span className="text-fg">{formatTokens(session.usage.outputTokens)}</span>
        </div>
      </td>

      {/* Cost */}
      <td className="px-4 py-3 text-sm text-fg text-right whitespace-nowrap font-medium">
        ${session.usage.costUSD.toFixed(2)}
      </td>
    </tr>
  );
}
