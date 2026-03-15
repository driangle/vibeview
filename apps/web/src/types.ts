export interface Session {
  id: string;
  project: string;
  display: string;
  timestamp: string;
  messageCount: number;
  model: string;
  slug: string;
}

export interface Usage {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens: number;
  cache_read_input_tokens: number;
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

export interface SessionDetail extends Session {
  messages: MessageResponse[];
}
