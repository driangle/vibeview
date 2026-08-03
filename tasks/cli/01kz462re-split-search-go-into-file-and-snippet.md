---
id: "01kz462re"
title: "Split search.go into search file and snippet"
status: pending
priority: medium
type: chore
dependencies: []
tags: ["refactor"]
created_at: 2026-08-03
---

# Split search.go into search file and snippet

## Objective

Split `apps/lib/search/search.go` (341 lines) so no resulting file exceeds 200 lines. The file holds the top-level search orchestration, the per-file scoring, and the snippet-building logic. Split along those three concerns.

## Tasks

- [ ] Keep in `search.go` — public surface and orchestration: `globalSem`, `Result`, `Options`, `Search`
- [ ] Create `searchfile.go` — per-file scanning and scoring: `searchFile`, `weightedText`, `betterSnippet`, and the related `const` block
- [ ] Create `snippet.go` — text extraction and snippet building: `searchableTexts`, `collectStrings`, `buildSnippet`
- [ ] Run `make check` to confirm everything compiles and tests pass

## Acceptance Criteria

- No non-test `.go` file in `apps/lib/search/` exceeds 200 lines
- Orchestration, per-file scoring, and snippet building are in separate files
- `make check` passes
