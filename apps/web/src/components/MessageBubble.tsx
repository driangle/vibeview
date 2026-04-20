import type { MessageResponse, ContentBlock } from '../types';
import { AgentProgressWidget } from './AgentProgressWidget';
import {
  AttachmentMessage,
  HookMessage,
  LastPromptMessage,
  PermissionModeMessage,
  QueueOperationMessage,
  SystemMessage,
  UnknownMessage,
} from './EventMessages';
import { ChannelMessage } from './ChannelMessage';
import { AssistantMessage } from './AssistantMessage';
import { UserMessage, SkillLoadedMessage } from './UserMessage';

function isHookMessage(msg: MessageResponse): boolean {
  return msg.type === 'progress' && msg.data?.type === 'hook_progress';
}

function isAgentProgressMessage(msg: MessageResponse): boolean {
  return msg.type === 'progress' && msg.data?.type === 'agent_progress';
}

interface MessageBubbleProps {
  message: MessageResponse;
  toolResults: Map<string, ContentBlock>;
  agentGroups: Map<string, MessageResponse[]>;
  agentGroupFirstIds: Set<string>;
  isLastMessage?: boolean;
  onFocusAgent?: (agentId: string) => void;
}

export function MessageBubble({
  message,
  toolResults,
  agentGroups,
  agentGroupFirstIds,
  isLastMessage,
  onFocusAgent,
}: MessageBubbleProps) {
  if (
    message.type === 'custom-title' ||
    message.type === 'ai-title' ||
    message.type === 'agent-name'
  ) {
    const label =
      message.type === 'custom-title'
        ? 'Title set'
        : message.type === 'ai-title'
          ? 'AI title'
          : 'Agent';
    const detail =
      message.type === 'custom-title'
        ? String(message.customTitle ?? message.data?.title ?? '')
        : message.type === 'ai-title'
          ? String(message.aiTitle ?? '')
          : String(message.data?.name ?? '');
    return (
      <div className="flex items-center overflow-hidden">
        <span className="border-l-2 border-gray-200 dark:border-gray-700 py-0.5 pl-2 pr-2 text-xs text-gray-400 dark:text-gray-500 max-w-full truncate">
          <span className="font-medium">{label}</span>
          {detail && <span className="ml-1.5 text-gray-400 dark:text-gray-500">{detail}</span>}
        </span>
      </div>
    );
  }

  if (message.type === 'file-history-snapshot') return null;

  if (message.type === 'user' && message.message) {
    const content = message.message.content;
    if (Array.isArray(content) && content.every((b) => b.type === 'tool_result')) {
      return null;
    }

    if (message.messageKind === 'skill-expansion') {
      return <SkillLoadedMessage message={message} />;
    }

    if (message.messageKind === 'channel-message') {
      return <ChannelMessage message={message} />;
    }

    return <UserMessage message={message} />;
  }

  if (message.type === 'assistant' && message.message) {
    return (
      <AssistantMessage
        message={message}
        toolResults={toolResults}
        isLastMessage={isLastMessage}
        onFocusAgent={onFocusAgent}
      />
    );
  }

  if (isAgentProgressMessage(message)) {
    if (!agentGroupFirstIds.has(message.uuid)) return null;
    const agentId = String(message.data?.agentId ?? '');
    const group = agentGroups.get(agentId);
    if (!group || group.length === 0) return null;
    return <AgentProgressWidget messages={group} onFocusAgent={onFocusAgent} agentId={agentId} />;
  }

  if (message.type === 'permission-mode') {
    return <PermissionModeMessage message={message} />;
  }

  if (message.type === 'attachment') {
    return <AttachmentMessage message={message} />;
  }

  if (message.type === 'queue-operation') {
    return <QueueOperationMessage message={message} />;
  }

  if (message.type === 'last-prompt') {
    return <LastPromptMessage message={message} />;
  }

  if (message.type === 'system' || message.type === 'progress') {
    if (isHookMessage(message)) {
      return <HookMessage message={message} />;
    }
    return <SystemMessage message={message} />;
  }

  console.warn('Unknown message type:', message.type);
  return <UnknownMessage message={message} />;
}
