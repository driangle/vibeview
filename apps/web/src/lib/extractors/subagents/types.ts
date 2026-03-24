import type { MessageResponse } from '../../../types';

interface SubagentBase {
  agentId: string;
  prompt: string;
  description: string;
  firstMessageUuid: string;
}

export interface SubagentFromProgress extends SubagentBase {
  source: 'agent_progress';
  turns: MessageResponse[];
}

export interface SubagentFromToolUse extends SubagentBase {
  source: 'tool_use';
  toolUseId: string;
  resultText: string | null;
}

export type SubagentInfo = SubagentFromProgress | SubagentFromToolUse;
