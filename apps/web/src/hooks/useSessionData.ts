import { useMemo, useEffect } from 'react';
import useSWR from 'swr';
import { fetcher } from '../api';
import type { SessionDetail, ContentBlock, MessageResponse, UsageTotals } from '../types';
import { calculateCost } from '../pricing';
import { useSessionStream } from './useSessionStream';

function buildToolResultMap(messages: MessageResponse[]): Map<string, ContentBlock> {
  const map = new Map<string, ContentBlock>();
  for (const msg of messages) {
    if (msg.type !== 'user' || !msg.message) continue;
    const content = msg.message.content;
    if (!Array.isArray(content)) continue;
    for (const block of content) {
      if (block.type === 'tool_result' && block.tool_use_id) {
        map.set(block.tool_use_id, block);
      }
    }
  }
  return map;
}

export function useSessionData(id: string | undefined) {
  const {
    data: session,
    error,
    isLoading,
  } = useSWR<SessionDetail>(id ? `/api/sessions/${id}` : null, fetcher);

  const { streamedMessages, connectionStatus, addInitialUUIDs } = useSessionStream(id);

  // Register initial message UUIDs so the SSE hook deduplicates.
  useEffect(() => {
    if (session) {
      addInitialUUIDs(session.messages.map((m) => m.uuid));
    }
  }, [session, addInitialUUIDs]);

  // Combine fetched + streamed messages.
  const allMessages = useMemo(() => {
    if (!session) return [];
    return [...session.messages, ...streamedMessages];
  }, [session, streamedMessages]);

  const toolResults = useMemo(() => buildToolResultMap(allMessages), [allMessages]);

  // Aggregate usage: session totals + any new streamed assistant messages.
  const liveUsage = useMemo<UsageTotals | null>(() => {
    if (!session) return null;
    const base = { ...session.usage };
    for (const msg of streamedMessages) {
      if (msg.type === 'assistant' && msg.message?.usage) {
        const u = msg.message.usage;
        base.inputTokens += u.input_tokens;
        base.outputTokens += u.output_tokens;
        base.cacheCreationInputTokens += u.cache_creation_input_tokens;
        base.cacheReadInputTokens += u.cache_read_input_tokens;
        base.costUSD += calculateCost(msg.message.model ?? '', u);
      }
    }
    return base;
  }, [session, streamedMessages]);

  // Derive live custom title from streamed custom-title events.
  const liveCustomTitle = useMemo(() => {
    for (let i = streamedMessages.length - 1; i >= 0; i--) {
      const msg = streamedMessages[i];
      if (msg.type === 'custom-title' && msg.customTitle) {
        return msg.customTitle;
      }
    }
    return null;
  }, [streamedMessages]);

  // Group agent_progress messages by agentId.
  const { agentGroups, agentGroupFirstIds } = useMemo(() => {
    const groups = new Map<string, MessageResponse[]>();
    const firstIds = new Set<string>();
    for (const msg of allMessages) {
      if (msg.type !== 'progress' || msg.data?.type !== 'agent_progress') continue;
      const agentId = String(msg.data.agentId ?? '');
      if (!agentId) continue;
      const existing = groups.get(agentId);
      if (existing) {
        existing.push(msg);
      } else {
        groups.set(agentId, [msg]);
        firstIds.add(msg.uuid);
      }
    }
    return { agentGroups: groups, agentGroupFirstIds: firstIds };
  }, [allMessages]);

  // Filter out non-renderable messages for pagination.
  const displayMessages = useMemo(() => {
    return allMessages.filter((m) => m.type !== 'file-history-snapshot');
  }, [allMessages]);

  return {
    session,
    error,
    isLoading,
    streamedMessages,
    connectionStatus,
    allMessages,
    toolResults,
    liveUsage,
    liveCustomTitle,
    displayMessages,
    agentGroups,
    agentGroupFirstIds,
  };
}
