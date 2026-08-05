import type { ContentBlock, Exchange, MessageResponse } from '../../types';

/**
 * The session-level message data the detail panel threads into `MessageBubble`.
 * Bundled so the panel and its host pass one prop instead of five. Mirrors what
 * `ConversationFlow` receives from `useSessionData`.
 */
export interface SessionMessageContext {
  messages: MessageResponse[];
  toolResults: Map<string, ContentBlock>;
  agentGroups: Map<string, MessageResponse[]>;
  agentGroupFirstIds: Set<string>;
  onFocusAgent?: (agentId: string) => void;
}

/**
 * The messages that belong to an exchange, in session (display) order. Resolves
 * the exchange's `messageUuids` against the already-loaded session messages —
 * the detail panel renders these, it does not refetch.
 */
export function resolveExchangeMessages({
  exchange,
  messages,
}: {
  exchange: Exchange;
  messages: MessageResponse[];
}): MessageResponse[] {
  const wanted = new Set(exchange.messageUuids);
  return messages.filter((m) => wanted.has(m.uuid));
}

/** A pill shown in the summary block, describing one active flag or skill. */
export interface ExchangeBadge {
  label: string;
  /** Background colour token (inline; semantic accent, no theme variable). */
  bg: string;
  /** Foreground colour token (inline). */
  fg: string;
}

/**
 * The badges for an exchange: one per active flag, then one per skill. Labels
 * and colours mirror the designer's detail mock (`Error in results`, `Deep
 * thinking`, `Subagent`, `Ended on approval`, `Skill /name`).
 */
export function exchangeBadges(exchange: Exchange): ExchangeBadge[] {
  const badges: ExchangeBadge[] = [];
  const { flags } = exchange;
  if (flags.hasErrors)
    badges.push({ label: 'Error in results', bg: 'hsl(0 70% 50% / 0.12)', fg: 'hsl(0 70% 38%)' });
  if (flags.deepThinking)
    badges.push({ label: 'Deep thinking', bg: 'hsl(270 60% 60% / 0.14)', fg: 'hsl(270 60% 40%)' });
  if (flags.hasSubagents)
    badges.push({ label: 'Subagent', bg: 'hsl(188 80% 45% / 0.14)', fg: 'hsl(190 70% 30%)' });
  if (flags.approvalGate)
    badges.push({
      label: 'Ended on approval',
      bg: 'hsl(48 90% 50% / 0.16)',
      fg: 'hsl(40 80% 32%)',
    });
  for (const skill of exchange.skills) {
    badges.push({ label: `Skill /${skill}`, bg: '#f5f3ff', fg: '#7c3aed' });
  }
  return badges;
}
