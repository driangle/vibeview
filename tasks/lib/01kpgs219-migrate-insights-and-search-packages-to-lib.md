---
title: "Migrate insights and search packages to lib"
id: "01kpgs219"
status: pending
priority: high
type: chore
tags: ["lib", "phase:1-extract"]
effort: medium
dependencies: ["01kpgs201"]
context: ["docs/specs/2026-04-18-extract-go-library.md", "apps/cli/internal/insights/extract.go", "apps/cli/internal/insights/types.go", "apps/cli/internal/search/search.go"]
created: "2026-04-18"
verify:
  - type: bash
    run: "cd apps/lib && go build ./... && go test ./..."
---

# Migrate insights and search packages to lib

## Objective

Move the `insights` and `search` packages into `apps/lib/`. These are the analysis and query layer — `insights` extracts tool counts, bash commands, errors, files, worktrees, skills, and subagents from messages; `search` provides full-text search across sessions. Both depend on `claude`, `session`, and `redact` which are already in the lib.

## Tasks

- [ ] Copy `apps/cli/internal/insights/` to `apps/lib/insights/` (all files: extract.go, types.go, tools.go, errors.go, commands.go, files.go, skills.go, subagents.go, worktrees.go, helpers.go, messagekind.go + tests)
- [ ] Copy `apps/cli/internal/search/` to `apps/lib/search/` (search.go)
- [ ] Update `insights` imports to reference `lib/claude`, `lib/redact`
- [ ] Update `search` imports to reference `lib/session`, `lib/claude`, `lib/redact`
- [ ] Verify: `cd apps/lib && go build ./... && go test ./...`

## Acceptance Criteria

- `insights` and `search` packages compile and all tests pass under `apps/lib/`
- `insights.Extract()` and `search.Search()` are importable from the lib module
- All 7 library packages build together without import cycles
