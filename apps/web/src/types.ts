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

export interface MessageResponse {
  uuid: string;
  type:
    | 'user'
    | 'assistant'
    | 'progress'
    | 'result'
    | 'system'
    | 'file-history-snapshot'
    | 'custom-title';
  timestamp: string;
  isMeta?: boolean;
  messageKind?: string;
  message?: APIMessage;
  content?: string;
  data?: MessageData;
  snapshot?: MessageData;
  customTitle?: string;
}

export interface PaginatedSessions {
  sessions: Session[];
  total: number;
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
    }[];
  };
  worktrees: { name: string; path: string; branch: string; messageUuid: string }[];
  skills: { name: string; count: number; messageUuid: string }[];
  subagents: {
    source: string;
    agentId: string;
    prompt: string;
    description: string;
    firstMessageUuid: string;
    toolUseId?: string;
    resultText?: string;
    turnCount?: number;
  }[];
}

export interface SessionDetail extends Session {
  filePath: string;
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
  hours: ActivityHour[];
  dirs: string[];
}

export interface SortSettings {
  column: string;
  direction: string;
}

export interface ModelPricing {
  inputPerM: number;
  outputPerM: number;
}

export interface Settings {
  theme: string;
  defaultSort: SortSettings;
  pageSize: number;
  dateFormat: string;
  autoFollow: boolean;
  refreshInterval: number;
  showCost: boolean;
  customModelPricing: Record<string, ModelPricing>;
  messagesPerPage: number;
  recentThreshold: number;
}
