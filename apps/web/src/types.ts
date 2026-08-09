import type { TimelineResponse } from './types/timeline';

export * from './types/timeline';
export * from './types/activity';

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
  /** Whether cost ($) figures are shown, driven by the server's
   *  VIBEVIEW_COST_ENABLED env var. See docs/cost.md. */
  costEnabled?: boolean;
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
