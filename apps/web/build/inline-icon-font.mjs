import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { collectIconNames } from './icon-names.mjs';

/**
 * Inlines the icon font (and a system font stack) into the exported page.
 *
 * The UI renders icons as Material Symbols ligatures, so with no font every
 * icon button shows its name as text -- an exported page must carry the font.
 * It carries the committed ~10 KB subset rather than the 1.1 MB original, and
 * skips the text web fonts entirely: those degrade to the system stack.
 *
 * The class rules below come from the stylesheet Google normally serves; the
 * live app gets them over the network (src/fonts-remote.css).
 */
export function inlineIconFont({ srcDir, fontPath, manifestPath }) {
  return {
    name: 'vibeview:inline-icon-font',

    buildStart() {
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
      const known = new Set([...manifest.included, ...manifest.excluded]);
      const missing = collectIconNames(srcDir).filter((name) => !known.has(name));
      if (missing.length > 0) {
        this.warn(
          `icon subset is out of date, missing: ${missing.join(', ')}. ` +
            'These icons will render as text in exported pages. ' +
            'Re-run: node scripts/generate-icon-subset.mjs',
        );
      }
    },

    transformIndexHtml(html) {
      const base64 = readFileSync(fontPath).toString('base64');
      const css = `
@font-face {
  font-family: 'Material Symbols Outlined';
  font-style: normal;
  font-weight: 100 700;
  src: url(data:font/woff2;base64,${base64}) format('woff2');
}
.material-symbols-outlined {
  font-family: 'Material Symbols Outlined';
  font-weight: normal;
  font-style: normal;
  line-height: 1;
  letter-spacing: normal;
  text-transform: none;
  display: inline-block;
  white-space: nowrap;
  word-wrap: normal;
  direction: ltr;
  font-feature-settings: 'liga';
  -webkit-font-smoothing: antialiased;
}
:root {
  --font-sans: ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif;
  --font-mono: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace;
}`;
      return {
        html,
        tags: [{ tag: 'style', children: css, injectTo: 'head' }],
      };
    },
  };
}

/** Default locations, relative to the web app root. */
export function iconFontPaths(root) {
  return {
    srcDir: join(root, 'src'),
    fontPath: join(root, 'src', 'export', 'material-symbols-subset.woff2'),
    manifestPath: join(root, 'src', 'export', 'icon-manifest.json'),
  };
}
