/** Branded alias for tool_use input payloads. Prefer narrowing via type guards over bare casts. */
export type ContentBlockInput = Record<string, unknown> & { __brand?: 'ContentBlockInput' };

/** Branded alias for opaque message data blobs. */
export type MessageData = Record<string, unknown> & { __brand?: 'MessageData' };

export interface Project {
  id: string;
  name: string;
  folderPaths: string[];
  description?: string;
  color?: string;
}

export interface AppConfig {
  claudeDir: string;
  standalone: boolean;
  paths?: string[];
  dirs?: string[];
  settingsPath: string;
  projectsPath: string;
}

export interface UsageTotals {
  inputTokens: number;
  outputTokens: number;
  cacheCreationInputTokens: number;
  cacheReadInputTokens: number;
  costUSD: number;
}

export type ActivityState = 'working' | 'waiting_for_approval' | 'waiting_for_input' | 'idle';

export interface Session {
  id: string;
  dir: string;
  customTitle: string;
  timestamp: string;
  messageCount: number;
  model: string;
  slug: string;
  usage: UsageTotals;
  activityState?: ActivityState;
}

export interface Usage {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens: number;
  cache_read_input_tokens: number;
  costUSD?: number;
}

export interface ContentBlock {
  type: string;
  text?: string;
  thinking?: string;
  signature?: string;
  id?: string;
  name?: string;
  input?: ContentBlockInput;
  tool_use_id?: string;
  content?: unknown;
  is_error?: boolean;
}

export interface APIMessage {
  role: string;
  model?: string;
  content: ContentBlock[] | string;
  usage?: Usage;
}

export interface ChannelInfo {
  source?: string;
  sourceId?: string;
  sourceName?: string;
  replyTo?: string;
  content: string;
}

export interface MessageResponse {
  uuid: string;
  type:
    | 'user'
    | 'assistant'
    | 'progress'
    | 'result'
    | 'system'
    | 'file-history-snapshot'
    | 'custom-title'
    | 'ai-title'
    | 'agent-name'
    | 'queue-operation'
    | 'last-prompt'
    | 'permission-mode'
    | 'attachment'
    | 'mode';
  timestamp: string;
  isMeta?: boolean;
  isSidechain?: boolean;
  activityState?: ActivityState;
  messageKind?: string;
  channelInfo?: ChannelInfo;
  message?: APIMessage;
  content?: string;
  data?: MessageData;
  snapshot?: MessageData;
  customTitle?: string;
  aiTitle?: string;
  permissionMode?: string;
  attachment?: MessageData;
}

export interface PaginatedSessions {
  sessions: Session[];
  total: number;
  // Aggregate usage over the full filtered set (server-computed), not just this page.
  totalTokens: number;
  totalCost: number;
}

export interface SessionInsights {
  tools: { name: string; count: number }[];
  commands: { command: string; toolUseId: string; messageUuid: string }[];
  errors: { toolName: string; snippet: string; messageUuid: string }[];
  files: {
    categories: { written: string[]; read: string[] };
    entries: {
      toolUseId: string;
      toolName: string;
      filePath: string;
      input: ContentBlockInput;
      timestamp: string;
      messageUuid: string;
      operation?:
        | { type: 'read' | 'write' | 'image'; content: string; timestamp: string }
        | { type: 'edit'; oldString: string; newString: string; timestamp: string };
    }[];
  };
  worktrees: { name: string; path: string; branch: string; messageUuid: string }[];
  skills: { name: string; count: number; messageUuid: string }[];
  subagents: {
    source: string;
    agentId: string;
    agentType?: string;
    prompt: string;
    description: string;
    firstMessageUuid: string;
    toolUseId?: string;
    resultText?: string;
    turnCount?: number;
  }[];
}

/** Boolean badges shown for a timeline exchange. Mirrors Go timeline.ExchangeFlags. */
export interface ExchangeFlags {
  hasErrors: boolean;
  deepThinking: boolean;
  hasSubagents: boolean;
  approvalGate: boolean;
}

/**
 * One user prompt and the assistant work that answers it, with the per-row and
 * detail-panel metrics the Timeline Track renders. Mirrors Go timeline.Exchange.
 */
export interface Exchange {
  index: number;
  startTime: string; // ISO 8601, "" if none
  endTime: string; // ISO 8601, "" if none
  durationMs: number;
  idleBeforeMs: number;
  promptPreview: string;
  model: string;
  tokens: number;
  costUSD: number;
  tools: string[];
  files: string[];
  commands: string[];
  skills: string[];
  flags: ExchangeFlags;
  messageUuids: string[];
}

/** One slice of the "where the time went" breakdown. Mirrors Go timeline.TimeSplitSegment. */
export interface TimeSplitSegment {
  label: string;
  durationMs: number;
  pct: number;
}

/** One row of the per-model breakdown. Mirrors Go timeline.ModelUsage. */
export interface ModelUsage {
  model: string;
  tokens: number;
  durationMs: number;
  costUSD: number;
  exchanges: number;
  switches: number;
}

/** One contiguous run of a single model on the overview strip. Mirrors Go timeline.ModelBand. */
export interface ModelBand {
  model: string;
  leftPct: number;
  widthPct: number;
  exchanges: number;
  firstIndex: number;
}

/** One column of the token sparkline. Mirrors Go timeline.OverviewBucket. */
export interface OverviewBucket {
  tokens: number;
  errorLevel: number; // 0 none, 1 one error, 2 two or more
}

/** A name/count pair for the busiest-files, top-commands, skills, and tool-mix lists. */
export interface Tally {
  name: string;
  count: number;
}

/** Session-level timeline aggregation. Mirrors Go timeline.TimelineInsights. */
export interface TimelineInsights {
  timeSplit: TimeSplitSegment[];
  models: ModelUsage[];
  modelBands: ModelBand[];
  modelSwitches: number;
  overviewBuckets: OverviewBucket[];
  busiestFiles: Tally[];
  topCommands: Tally[];
  skills: Tally[];
  toolMix: Tally[];
  errorCount: number;
  longestExchangeIndex: number; // -1 when there are no exchanges
  top5TokenSharePct: number;
  totalTokens: number;
  totalCostUSD: number;
  totalDurationMs: number;
  totalIdleMs: number;
}

/** The Timeline Track payload for a single session. Mirrors Go timeline.TimelineResponse. */
export interface TimelineResponse {
  exchanges: Exchange[];
  insights: TimelineInsights;
}

export interface SessionDetail extends Session {
  filePath: string;
  messages: MessageResponse[];
  insights?: SessionInsights;
  timeline?: TimelineResponse;
  skippedLines?: number;
}

export interface SubagentDetail {
  agentId: string;
  agentType?: string;
  description?: string;
  messages: MessageResponse[];
  insights?: SessionInsights;
  skippedLines?: number;
}

export interface SearchResult {
  session: Session;
  snippet: string;
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
}

export interface ActivityDay {
  date: string;
  count: number;
}

export interface ActivityHour {
  hour: number;
  count: number;
}

export interface ActivityResponse {
  days: ActivityDay[];
  dayYears: Array<{
    year: number;
    weeks: Array<Array<{ date: string; count: number; dayOfWeek: number }>>;
    monthLabels: Array<{ label: string; col: number }>;
  }>;
  weekYears: Array<{
    year: number;
    cells: Array<{ count: number; month: number; fromDate: string; toDate: string }>;
    monthLabels: Array<{ label: string; col: number }>;
  }>;
  months: { shortLabel: string; count: number; fromDate: string; toDate: string }[];
  hours: ActivityHour[];
  dirs: string[];
}
