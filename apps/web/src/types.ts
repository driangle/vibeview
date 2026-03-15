export interface UsageTotals {
  inputTokens: number;
  outputTokens: number;
  cacheCreationInputTokens: number;
  cacheReadInputTokens: number;
  costUSD: number;
}

export interface Session {
  id: string;
  project: string;
  customTitle: string;
  timestamp: string;
  messageCount: number;
  model: string;
  slug: string;
  usage: UsageTotals;
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
  input?: Record<string, unknown>;
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
  type: "user" | "assistant" | "progress" | "system" | "file-history-snapshot";
  timestamp: string;
  message?: APIMessage;
  data?: Record<string, unknown>;
  snapshot?: Record<string, unknown>;
}

export interface PaginatedSessions {
  sessions: Session[];
  total: number;
}

export interface SessionDetail extends Session {
  filePath: string;
  messages: MessageResponse[];
}
