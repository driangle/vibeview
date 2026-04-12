import { useMemo } from 'react';
import useSWR from 'swr';
import { fetcher } from '../api';
import type { ContentBlock, SessionInsights, SubagentDetail } from '../types';
import { buildToolResultMap } from './useSessionData';

export function useSubagentData(
  sessionId: string | undefined,
  focusedAgentId: string | null,
  insights: SessionInsights | null,
) {
  const { data: subagentData, isLoading: subagentLoading } = useSWR<SubagentDetail>(
    focusedAgentId && sessionId ? `/api/sessions/${sessionId}/subagents/${focusedAgentId}` : null,
    fetcher,
  );

  const subagentToolResults = useMemo(() => {
    if (!subagentData) return new Map<string, ContentBlock>();
    return buildToolResultMap(subagentData.messages);
  }, [subagentData]);

  const subagentDisplayMessages = useMemo(() => {
    if (!subagentData) return [];
    return subagentData.messages.filter((m) => m.type !== 'file-history-snapshot');
  }, [subagentData]);

  const focusedAgentPrompt = useMemo(() => {
    if (!focusedAgentId || !insights) return '';
    const agent = insights.subagents.find((a) => a.agentId === focusedAgentId);
    return agent?.prompt ?? 'Agent';
  }, [focusedAgentId, insights]);

  return {
    subagentData,
    subagentLoading,
    subagentToolResults,
    subagentDisplayMessages,
    focusedAgentPrompt,
  };
}
