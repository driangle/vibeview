#!/usr/bin/env node
/**
 * Regenerates the icon-font subset the static export inlines.
 *
 * Maintainer-only: the result is committed, so building vibeview does not need
 * Python. Re-run it after adding an icon the UI did not use before -- the export
 * build warns when the committed subset has drifted from the source.
 *
 *   pip install 'fonttools[woff]' brotli
 *   node scripts/generate-icon-subset.mjs
 */
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { collectIconNames } from '../build/icon-names.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const names = collectIconNames(join(root, 'src'));

const result = spawnSync(
  process.env.PYTHON ?? 'python3',
  [
    join(root, 'scripts', 'subset_icon_font.py'),
    join(root, 'public', 'fonts', 'material-symbols-outlined.woff2'),
    join(root, 'src', 'export', 'material-symbols-subset.woff2'),
    join(root, 'src', 'export', 'icon-manifest.json'),
    ...names,
  ],
  { stdio: 'inherit' },
);

process.exit(result.status ?? 1);
