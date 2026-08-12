import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Finds the Material Symbols icon names the UI can render.
 *
 * Icons are ligatures: `<span className="material-symbols-outlined">arrow_back</span>`
 * renders a glyph only if the font contains that ligature. The static export
 * ships a subset of the font (see scripts/generate-icon-subset.mjs), so both the
 * subset generator and the export build need the same list — this module is the
 * single source of truth for it.
 *
 * Names reach the DOM three ways, all matched below: as span text, as an `icon`
 * prop, and as an `icon` field in a lookup table.
 */
const PATTERNS = [
  /material-symbols-outlined[^>]*>\s*([a-z][a-z0-9_]*)\s*</g,
  /\bicon=["']([a-z][a-z0-9_]*)["']/g,
  /\bicon:\s*["']([a-z][a-z0-9_]*)["']/g,
];

function sourceFiles(dir) {
  const files = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      files.push(...sourceFiles(path));
    } else if (/\.tsx?$/.test(entry) && !/\.test\.tsx?$/.test(entry)) {
      files.push(path);
    }
  }
  return files;
}

/** Returns the sorted, deduplicated icon names used under `srcDir`. */
export function collectIconNames(srcDir) {
  const names = new Set();
  for (const file of sourceFiles(srcDir)) {
    const content = readFileSync(file, 'utf8');
    for (const pattern of PATTERNS) {
      for (const match of content.matchAll(pattern)) {
        names.add(match[1]);
      }
    }
  }
  return [...names].sort();
}
