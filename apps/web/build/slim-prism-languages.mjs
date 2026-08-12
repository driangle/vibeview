/**
 * Keeps the static export small by bundling only the syntax grammars that are
 * worth their bytes.
 *
 * `PrismAsyncLight` (components/CodeBlock.tsx) dynamic-imports one module per
 * language -- about 300 of them, 1.3 MB of the web bundle. A single-file export
 * has to inline every dynamic import, so the unlisted languages are replaced
 * with a do-nothing grammar. Prism then fails to highlight them and
 * `react-syntax-highlighter` falls back to rendering the code unstyled, which is
 * what an unrecognised language does today anyway.
 */
const STUB_PREFIX = '\0vibeview-stub-language:';

/** Languages worth bundling: everything detectLanguage() can return, plus the
 *  fenced-code languages that actually show up in sessions. */
export const BUNDLED_LANGUAGES = [
  'bash',
  'c',
  'clike',
  'cpp',
  'csharp',
  'css',
  'diff',
  'docker',
  'git',
  'go',
  'graphql',
  'hcl',
  'html',
  'ini',
  'java',
  'javascript',
  'json',
  'jsx',
  'kotlin',
  'lua',
  'makefile',
  'markdown',
  'markup',
  'php',
  'protobuf',
  'python',
  'regex',
  'ruby',
  'rust',
  'scss',
  'shell-session',
  'sql',
  'swift',
  'toml',
  'tsx',
  'typescript',
  'xml',
  'yaml',
];

export function slimPrismLanguages(languages = BUNDLED_LANGUAGES) {
  const keep = new Set(languages);

  return {
    name: 'vibeview:slim-prism-languages',
    enforce: 'pre',

    resolveId(source, importer) {
      // Only the highlighter's language table is rewritten: it is the one
      // module that imports grammars by bare specifier. refractor's own modules
      // use relative paths, so a kept grammar still gets its dependencies, and
      // the package's API entry points (refractor/all, refractor/core) are left
      // alone.
      if (!importer?.includes('async-languages')) return null;
      const match = /^refractor\/([\w-]+)$/.exec(source);
      if (!match || keep.has(match[1])) return null;
      return STUB_PREFIX + match[1];
    },

    load(id) {
      if (!id.startsWith(STUB_PREFIX)) return null;
      const name = id.slice(STUB_PREFIX.length);
      // Prefixed because some grammars are named after reserved words
      // (refractor/false), which cannot be function identifiers.
      const identifier = `language_${name.replace(/\W/g, '_')}`;
      return [
        `// '${name}' is not bundled in static exports; code renders unhighlighted.`,
        `${identifier}.displayName = '${name}';`,
        `${identifier}.aliases = [];`,
        `export default function ${identifier}() {}`,
      ].join('\n');
    },
  };
}
