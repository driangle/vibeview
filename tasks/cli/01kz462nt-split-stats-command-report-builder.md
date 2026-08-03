---
id: "01kz462nt"
title: "Split stats command report builder"
status: pending
priority: medium
type: chore
dependencies: []
tags: ["refactor"]
created_at: 2026-08-03
---

# Split stats command report builder

## Objective

Split `apps/cli/cmd/vibeview/stats.go` (349 lines) so no resulting file exceeds 200 lines. Separate the command wiring and report types from the report building and rendering logic.

## Tasks

- [ ] Keep in `stats.go` — report types and command wiring: `statsReport`, `statsDateRange`, `modelBreakdown`, `statsCmd`, `resolveClaudeDir`
- [ ] Create `stats_report.go` — report computation and rendering: `buildStatsReport`, `renderStatsStyled`
- [ ] Run `make check` to confirm everything compiles and tests pass

## Acceptance Criteria

- No non-test `.go` file resulting from this split exceeds 200 lines
- Command wiring is separated from report building/rendering
- `make check` passes
