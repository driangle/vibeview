import type { MessageResponse, ContentBlock } from '../types';
import { AgentProgressWidget } from './AgentProgressWidget';
import {
  AttachmentMessage,
  HookMessage,
  LastPromptMessage,
  PermissionModeMessage,
  QueueOperationMessage,
  SystemMessage,
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
  if (message.type === 'custom-title' || message.type === 'agent-name') {
    const label = message.type === 'custom-title' ? 'Title set' : 'Agent';
    const detail =
      message.type === 'custom-title'
        ? String(message.data?.title ?? '')
        : String(message.data?.name ?? '');
    return (
      <div className="flex items-center">
        <span className="border-l-2 border-gray-200 dark:border-gray-700 py-0.5 pl-2 pr-2 text-xs text-gray-400 dark:text-gray-500">
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

  // Unknown message type — log and render a fallback
  console.warn('Unknown message type:', message.type);
  return (
    <div className="my-1 rounded-lg border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 text-xs text-amber-600 dark:text-amber-400">
      <span className="font-medium">Unknown message type:</span>{' '}
      <span className="font-mono">{message.type}</span>
    </div>
  );
}
