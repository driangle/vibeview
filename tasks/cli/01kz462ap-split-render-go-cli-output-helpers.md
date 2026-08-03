---
id: "01kz462ap"
title: "Split render.go CLI output helpers"
status: pending
priority: medium
type: chore
dependencies: []
tags: ["refactor"]
created_at: 2026-08-03
---

# Split render.go CLI output helpers

## Objective

Split `apps/cli/cmd/vibeview/render.go` (478 lines) so no resulting file exceeds 200 lines. The file combines low-level styling/formatting primitives with the higher-level report renderers. Separate the primitives from the renderers, and split the renderers by concern.

## Tasks

- [ ] Create `format.go` — color/ANSI helpers (`colorEnabled`, `detectColor`, `ansi`, `bold`, `dim`, `cyan`, `yellow`, `red`), value formatters (`formatCommas`, `formatCost`, `relativeTime`, `formatTimestamp`, `formatFileSize`, `stripANSI`), and table primitives (`sectionTitle`, `row`, `rowIndent`, `tableRow`, `renderTable`)
- [ ] Keep in `render.go` — the top-level report renderers: `renderStyled`, `renderLookupStyled`, `renderFileStyled`, `renderDirectoryStyled`
- [ ] Create `render_sections.go` — the section renderers: `renderConversationSection`, `renderInsightsSections`, `renderVerboseLookup`, `renderParseSection`
- [ ] Run `make check` to confirm everything compiles and tests pass

## Acceptance Criteria

- No non-test `.go` file resulting from this split exceeds 200 lines
- Formatting/styling primitives are separated from report rendering
- `make check` passes
