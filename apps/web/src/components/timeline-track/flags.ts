import type { ExchangeFlags } from '../../types';

/**
 * The boolean exchange flags rendered as coloured dots on a row (and later as
 * labelled badges in the detail panel), in display order. Colours mirror the
 * designer's Timeline palette; these are semantic accent dots with no theme
 * token, so the hex values are the single source of truth.
 */
export const FLAG_META: {
  key: keyof ExchangeFlags;
  label: string;
  color: string;
}[] = [
  { key: 'hasErrors', label: 'Errors', color: '#ef4444' },
  { key: 'hasSubagents', label: 'Subagents', color: '#06b6d4' },
  { key: 'deepThinking', label: 'Thinking', color: '#8b5cf6' },
  { key: 'approvalGate', label: 'Approvals', color: '#eab308' },
];
