#!/usr/bin/env python3
"""Subset the Material Symbols font down to the icons the UI actually renders.

Material Symbols is 1.1 MB because it carries ~3600 icons. A static export must
inline the font to work offline, so it inlines this subset (~8 KB) instead.

Subsetting by text does not work here: icons are ligatures spelled out in
letters, and layout closure then pulls in every ligature those letters can form
-- the whole font. Selecting the icon glyphs by name with layout closure off is
what keeps the result small while preserving the `rlig` rules that turn
"arrow_back" into a glyph.

Usage: subset_icon_font.py <source.woff2> <out.woff2> <out-manifest.json> <name>...
Requires: pip install 'fonttools[woff]' brotli
"""

import json
import sys

from fontTools.subset import Options, Subsetter
from fontTools.ttLib import TTFont

# Ligature substitution lives in `rlig`; the rest are the features a variable
# icon font needs to keep rendering correctly at other weights/fills.
LAYOUT_FEATURES = ["rlig", "rclt", "liga", "calt", "ccmp"]

# Ligature inputs: every icon name is spelled with these characters.
LIGATURE_INPUT_TEXT = "abcdefghijklmnopqrstuvwxyz0123456789_"


def main(argv: list[str]) -> int:
    if len(argv) < 5:
        print(__doc__, file=sys.stderr)
        return 2

    source, out_font, out_manifest, *candidates = argv[1:]

    font = TTFont(source)
    glyphs = set(font.getGlyphOrder())

    # Callers pass every icon-ish name found in the source. Some are the app's
    # own semantic labels (SortHeader's "clock"/"dollar") rather than icon
    # names; they map to real icons elsewhere, so drop them rather than fail.
    included = sorted(n for n in candidates if n in glyphs)
    excluded = sorted(set(candidates) - set(included))
    if not included:
        print("error: none of the requested names are glyphs in the font", file=sys.stderr)
        return 1

    options = Options()
    options.flavor = "woff2"
    options.layout_features = LAYOUT_FEATURES
    options.layout_closure = False
    options.notdef_outline = True

    subsetter = Subsetter(options=options)
    subsetter.populate(glyphs=included, text=LIGATURE_INPUT_TEXT)
    subsetter.subset(font)
    font.flavor = "woff2"
    font.save(out_font)

    with open(out_manifest, "w") as f:
        json.dump({"included": included, "excluded": excluded}, f, indent=2)
        f.write("\n")

    print(f"subset {len(included)} icons -> {out_font}")
    if excluded:
        print(f"not icon names, skipped: {', '.join(excluded)}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
