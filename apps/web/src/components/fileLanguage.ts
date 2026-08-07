// Maps file extensions (and a couple of well-known filenames) to the language
// identifiers used by the syntax highlighter. Kept separate from the viewer so
// the mapping can grow without bloating the component.
const EXT_TO_LANGUAGE: Record<string, string> = {
  ts: 'typescript',
  tsx: 'tsx',
  js: 'javascript',
  jsx: 'jsx',
  json: 'json',
  css: 'css',
  scss: 'scss',
  html: 'html',
  md: 'markdown',
  py: 'python',
  rs: 'rust',
  go: 'go',
  yaml: 'yaml',
  yml: 'yaml',
  toml: 'toml',
  sh: 'bash',
  bash: 'bash',
  zsh: 'bash',
  sql: 'sql',
  xml: 'xml',
  svg: 'xml',
  graphql: 'graphql',
  dockerfile: 'docker',
};

/** Detects a highlighter language id from a file path, or undefined if unknown. */
export function detectLanguage(filePath: string): string | undefined {
  const fileName = filePath.split('/').pop() || '';
  const lower = fileName.toLowerCase();

  if (lower === 'dockerfile') return 'docker';
  if (lower === 'makefile') return 'makefile';

  const ext = fileName.split('.').pop()?.toLowerCase();
  if (!ext) return undefined;
  return EXT_TO_LANGUAGE[ext];
}
