import type { CycleFeatures, Phase } from './types';

const TEST_PATTERNS = [
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
];

const DEVOPS_PATTERNS = [
  /\bgit\s+(commit|push|merge|rebase|tag)\b/i,
  /\bgh\s+(pr|issue|release)\b/i,
  /\bdocker\b/i,
  /\bmake\s+build\b/i,
  /\bdeploy\b/i,
  /\bkubectl\b/i,
];

const CONFIG_EXTENSIONS = new Set(['.json', '.yaml', '.yml', '.toml', '.env', '.ini', '.cfg']);

const CONFIG_FILENAME_PATTERNS = [
  /\.config\./i,
  /Makefile$/i,
  /Dockerfile$/i,
  /docker-compose/i,
  /\.rc$/i,
  /\.conf$/i,
];

const RESEARCH_TOOLS = new Set(['Glob', 'Grep', 'Read', 'Agent']);

function matchesBashPatterns(commands: string[], patterns: RegExp[]): boolean {
  return commands.some((cmd) => patterns.some((p) => p.test(cmd)));
}

export function classifyPhase(features: CycleFeatures): Phase {
  // 1. Debugging — errors present
  if (features.hasErrors) {
    return 'debugging';
  }

  // 2. Testing — bash commands match test patterns
  if (matchesBashPatterns(features.bashCommands, TEST_PATTERNS)) {
    return 'testing';
  }

  // 3. DevOps — bash commands match git/deploy patterns
  if (matchesBashPatterns(features.bashCommands, DEVOPS_PATTERNS)) {
    return 'devops';
  }

  // 4. Configuration — editing config files
  const hasEditOrWrite = features.toolNames.has('Edit') || features.toolNames.has('Write');
  if (hasEditOrWrite) {
    const touchesConfigExt = [...features.fileExtensions].some((ext) => CONFIG_EXTENSIONS.has(ext));
    const touchesConfigFile = [...features.filePaths].some((fp) =>
      CONFIG_FILENAME_PATTERNS.some((p) => p.test(fp)),
    );
    if (touchesConfigExt || touchesConfigFile) {
      return 'configuration';
    }
  }

  // 5. Coding — editing or writing files
  if (hasEditOrWrite) {
    return 'coding';
  }

  // 6. Research — only read-oriented tools
  if (features.toolNames.size > 0 && [...features.toolNames].every((t) => RESEARCH_TOOLS.has(t))) {
    return 'research';
  }

  // 7. Planning — thinking-heavy or text-heavy with no tools
  const hasNoTools = features.toolNames.size === 0;
  if (features.thinkingTokens > 0 && hasNoTools) {
    return 'planning';
  }
  if (hasNoTools && features.textTokens > 200) {
    return 'planning';
  }

  // 8. Conversation — fallback
  return 'conversation';
}
