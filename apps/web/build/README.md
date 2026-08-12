# Static export build

Build helpers for `vibeview export`, the CLI command that renders one session to
a single self-contained HTML file. They are plain `.mjs` so the same code can run
under bare node (`scripts/generate-icon-subset.mjs`) and inside Vite.

```sh
npm run build:export   # -> dist-export/export.html, copied to apps/cli/internal/export/template.html by `make web-export`
```

The exported page renders the web app's `SessionView` from data the CLI embeds
in the page, so it must open with no server and no network requests.

| File | Role |
|------|------|
| `single-file.mjs` | Inlines the JS and CSS into the HTML and drops the standalone assets |
| `slim-prism-languages.mjs` | Stubs out the ~300 syntax grammars not on the keep-list (1.3 MB → ~100 KB) |
| `inline-icon-font.mjs` | Inlines the icon-font subset and a system font stack |
| `icon-names.mjs` | Finds the Material Symbols icon names the UI renders |

## Regenerating the icon subset

Icons are ligatures, so a page with no icon font shows `arrow_back` as text
rather than a glyph. The export inlines a ~10 KB subset of the 1.1 MB font,
committed at `src/export/material-symbols-subset.woff2`.

After adding an icon the UI has not used before, regenerate it:

```sh
pip install 'fonttools[woff]' brotli
npm run icon-subset
```

The export build warns when it finds an icon name that the committed subset does
not cover. Subsetting by text does not work here: layout closure pulls in every
ligature the letters can spell, which is the entire font — the generator selects
the icon glyphs by name with closure disabled instead.
