---
id: "01kz462ar"
title: "Split related command rendering"
status: pending
priority: low
type: chore
dependencies: []
tags: ["refactor"]
created_at: 2026-08-03
---

# Split related command rendering

## Objective

Split `apps/cli/cmd/vibeview/related.go` (281 lines) so no resulting file exceeds 200 lines. Extract the terminal rendering functions, leaving the command wiring and data-building logic in place.

## Tasks

- [ ] Keep in `related.go` — types, command, and data building: `relatedJSON`, `subagentEntry`, `toSubagentEntry`, `relatedCmd`, `relatedOptions`, `relatedResult`, `toJSON`, `buildRelated`, `resolveTarget`
- [ ] Create `related_render.go` — terminal rendering: `renderRelated`, `renderSubagentsSection`, `renderSiblingsSection`
- [ ] Run `make check` to confirm everything compiles and tests pass

## Acceptance Criteria

- No non-test `.go` file resulting from this split exceeds 200 lines
- Rendering is separated from command wiring and data building
- `make check` passes
