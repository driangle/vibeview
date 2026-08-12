import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { inlineIconFont, iconFontPaths } from './build/inline-icon-font.mjs';
import { singleFile } from './build/single-file.mjs';
import { slimPrismLanguages } from './build/slim-prism-languages.mjs';

const root = dirname(fileURLToPath(import.meta.url));

/**
 * Builds the template `vibeview export` fills in: one self-contained HTML file
 * rendering the same SessionView the web app renders, from data embedded in the
 * page. Plain JS (not .ts) so the build helpers can be shared with
 * scripts/generate-icon-subset.mjs, which runs under bare node.
 *
 * Output: dist-export/export.html
 */
export default defineConfig({
  root,
  // Relative URLs matter for a page opened over file://.
  base: './',
  // The page must be the only artifact, so nothing is copied alongside it.
  publicDir: false,
  plugins: [
    slimPrismLanguages(),
    react(),
    tailwindcss(),
    inlineIconFont(iconFontPaths(root)),
    singleFile(),
  ],
  // With code splitting off there are no chunks to preload, and the marker vite
  // normally substitutes into dynamic imports is left dangling — it throws the
  // first time a code block loads its grammar.
  define: { __VITE_PRELOAD__: 'void 0' },
  build: {
    outDir: 'dist-export',
    emptyOutDir: true,
    cssCodeSplit: false,
    // No second file may exist alongside the HTML, so every asset is inlined
    // and every dynamic import folded into the single chunk.
    assetsInlineLimit: Number.MAX_SAFE_INTEGER,
    rollupOptions: {
      input: resolve(root, 'export.html'),
      output: { codeSplitting: false },
    },
  },
});
