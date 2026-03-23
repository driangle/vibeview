import type { CycleFeatures, Phase } from './types';

export interface PhaseRule {
  phase: Phase;
  priority: number;
  match: (features: CycleFeatures) => boolean;
}

function matchesBashPatterns(commands: string[], patterns: RegExp[]): boolean {
  return commands.some((cmd) => patterns.some((p) => p.test(cmd)));
}

function hasToolsOnly(features: CycleFeatures, allowed: Set<string>): boolean {
  return features.toolNames.size > 0 && [...features.toolNames].every((t) => allowed.has(t));
}

function touchesFilePatterns(
  features: CycleFeatures,
  extensions: Set<string>,
  filenames: RegExp[],
): boolean {
  const extMatch = [...features.fileExtensions].some((ext) => extensions.has(ext));
  const nameMatch = [...features.filePaths].some((fp) => filenames.some((p) => p.test(fp)));
  return extMatch || nameMatch;
}

const builtInRules: PhaseRule[] = [
  {
    phase: 'debugging',
    priority: 10,
    match: (f) => f.hasErrors,
  },
  {
    phase: 'testing',
    priority: 20,
    match: (f) =>
      matchesBashPatterns(f.bashCommands, [
        /\btest\b/i,
        /\bjest\b/i,
        /\bpytest\b/i,
        /\bvitest\b/i,
        /\bcargo\s+test\b/i,
        /\bgo\s+test\b/i,
        /\bmake\s+test\b/i,
        /\bnpm\s+test\b/i,
        /\byarn\s+test\b/i,
        /\bpnpm\s+test\b/i,
      ]),
  },
  {
    phase: 'devops',
    priority: 30,
    match: (f) =>
      matchesBashPatterns(f.bashCommands, [
        /\bgit\s+(commit|push|merge|rebase|tag)\b/i,
        /\bgh\s+(pr|issue|release)\b/i,
        /\bdocker\b/i,
        /\bmake\s+build\b/i,
        /\bdeploy\b/i,
        /\bkubectl\b/i,
      ]),
  },
  {
    phase: 'configuration',
    priority: 40,
    match: (f) =>
      (f.toolNames.has('Edit') || f.toolNames.has('Write')) &&
      touchesFilePatterns(f, new Set(['.json', '.yaml', '.yml', '.toml', '.env', '.ini', '.cfg']), [
        /\.config\./i,
        /Makefile$/i,
        /Dockerfile$/i,
        /docker-compose/i,
        /\.rc$/i,
        /\.conf$/i,
      ]),
  },
  {
    phase: 'coding',
    priority: 50,
    match: (f) => f.toolNames.has('Edit') || f.toolNames.has('Write'),
  },
  {
    phase: 'research',
    priority: 60,
    match: (f) => hasToolsOnly(f, new Set(['Glob', 'Grep', 'Read', 'Agent'])),
  },
  {
    phase: 'planning',
    priority: 70,
    match: (f) => {
      const hasNoTools = f.toolNames.size === 0;
      return (f.thinkingTokens > 0 && hasNoTools) || (hasNoTools && f.textTokens > 200);
    },
  },
];

let rules: PhaseRule[] = [...builtInRules];
let sorted: PhaseRule[] = sortRules(rules);

function sortRules(r: PhaseRule[]): PhaseRule[] {
  return [...r].sort((a, b) => a.priority - b.priority);
}

/** Add a custom phase rule. Lower priority = checked first. */
export function addPhaseRule(rule: PhaseRule): void {
  rules.push(rule);
  sorted = sortRules(rules);
}

/** Replace all rules (including built-ins) with a custom set. */
export function setPhaseRules(newRules: PhaseRule[]): void {
  rules = [...newRules];
  sorted = sortRules(rules);
}

/** Reset to built-in rules only. */
export function resetPhaseRules(): void {
  rules = [...builtInRules];
  sorted = sortRules(rules);
}

/** Get the current active rules (read-only). */
export function getPhaseRules(): readonly PhaseRule[] {
  return sorted;
}

export function classifyPhase(features: CycleFeatures): Phase {
  for (const rule of sorted) {
    if (rule.match(features)) {
      return rule.phase;
    }
  }
  return 'conversation';
}
