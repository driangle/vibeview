---
id: "01kz462vm"
title: "Split sessions command helpers"
status: pending
priority: low
type: chore
dependencies: []
tags: ["refactor"]
created_at: 2026-08-03
---

# Split sessions command helpers

## Objective

Split `apps/cli/cmd/vibeview/sessions.go` (275 lines) so no resulting file exceeds 200 lines. Extract the sorting, pagination, enrichment, and table-rendering helpers, leaving the command and its JSON types in place.

## Tasks

- [ ] Keep in `sessions.go` — command and output types: `sessionsCmd`, `sessionsJSON`, `sessionEntry`, `toSessionEntry`
- [ ] Create `sessions_helpers.go` — sorting, pagination, enrichment, and table rendering: `sortSessions`, `renderSessionsTable`, `truncateStr`, `sortNeedsEnrichment`, `paginateSessions`, `enrichSessions`
- [ ] Run `make check` to confirm everything compiles and tests pass

## Acceptance Criteria

- No non-test `.go` file resulting from this split exceeds 200 lines
- Sorting/pagination/enrichment/rendering helpers are separated from the command
- `make check` passes
