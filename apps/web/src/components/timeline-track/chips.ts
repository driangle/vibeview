import type { Exchange } from '../../types';

/** The five filter chips, in toolbar order. */
export type TimelineFilterKey = 'errors' | 'subagents' | 'thinking' | 'approvals' | 'skills';

/** Which chips are currently toggled on. */
export type FilterState = Record<TimelineFilterKey, boolean>;

/** No filters active — the default and the reset target. */
export const EMPTY_FILTERS: FilterState = {
  errors: false,
  subagents: false,
  thinking: false,
  approvals: false,
  skills: false,
};

/**
 * One filter chip: its label, accent colour (a dot, or an icon for Skills), and
 * the predicate that decides whether an exchange matches it. Colours mirror the
 * designer's Timeline palette (see {@link ./flags}); these semantic accents have
 * no theme token, so the hex values are the single source of truth.
 */
export interface ChipSpec {
  key: TimelineFilterKey;
  label: string;
  color: string;
  /** Material symbol shown instead of a colour dot (Skills only). */
  icon?: string;
  matches: (exchange: Exchange) => boolean;
}

export const CHIP_SPECS: ChipSpec[] = [
  { key: 'errors', label: 'Errors', color: '#ef4444', matches: (e) => e.flags.hasErrors },
  { key: 'subagents', label: 'Subagents', color: '#06b6d4', matches: (e) => e.flags.hasSubagents },
  { key: 'thinking', label: 'Thinking', color: '#8b5cf6', matches: (e) => e.flags.deepThinking },
  { key: 'approvals', label: 'Approvals', color: '#eab308', matches: (e) => e.flags.approvalGate },
  {
    key: 'skills',
    label: 'Skills',
    color: '#7c3aed',
    icon: 'magic_button',
    matches: (e) => e.skills.length > 0,
  },
];

/** True when at least one chip is toggled on. */
export function anyFilterActive(filters: FilterState): boolean {
  return CHIP_SPECS.some((spec) => filters[spec.key]);
}
