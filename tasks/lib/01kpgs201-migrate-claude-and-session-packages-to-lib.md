---
title: "Migrate claude and session packages to lib"
id: "01kpgs201"
status: pending
priority: critical
type: chore
tags: ["lib", "phase:1-extract"]
effort: medium
dependencies: ["01kpgs1b7"]
context: ["docs/specs/2026-04-18-extract-go-library.md", "apps/cli/internal/claude/claude.go", "apps/cli/internal/session/session.go", "apps/cli/internal/session/activity.go"]
created: "2026-04-18"
verify:
  - type: bash
    run: "cd apps/lib && go build ./... && go test ./..."
---

# Migrate claude and session packages to lib

## Objective

Move the `claude` and `session` packages into `apps/lib/`. These are the core data model and discovery layer — `claude` defines all JSONL types and parsing, `session` provides the thread-safe Index, discovery, enrichment, and activity state derivation. They depend on the leaf packages (`logutil`, `pathutil`) already migrated in the previous task.

## Tasks

- [ ] Copy `apps/cli/internal/claude/` to `apps/lib/claude/` (claude.go + claude_test.go)
- [ ] Copy `apps/cli/internal/session/` to `apps/lib/session/` (session.go, activity.go + tests)
- [ ] Update `claude` imports to reference `github.com/driangle/vibeview/lib/logutil`
- [ ] Update `session` imports to reference `github.com/driangle/vibeview/lib/claude`, `lib/pathutil`, `lib/logutil`
- [ ] Verify: `cd apps/lib && go build ./... && go test ./...`

## Acceptance Criteria

- `claude` and `session` packages compile and all tests pass under `apps/lib/`
- `session.Index`, `claude.ParseSessionFile`, and `claude.Message` are importable from the lib module
- Inter-package imports within `apps/lib/` use the new module path (no `internal/`)
