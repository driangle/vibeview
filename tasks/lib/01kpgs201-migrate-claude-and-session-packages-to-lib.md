---
title: "Migrate claude and session packages to lib"
id: "01kpgs201"
status: completed
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
completed_at: 2026-08-01
---

# Migrate claude and session packages to lib

## Objective

Move the `claude` and `session` packages into `apps/lib/`. These are the core data model and discovery layer — `claude` defines all JSONL types and parsing, `session` provides the thread-safe Index, discovery, enrichment, and activity state derivation. They depend on the leaf packages (`logutil`, `pathutil`) already migrated in the previous task.

Because `claude` becomes available in `apps/lib/` here, this task also completes the `redact` migration by moving `redact/message.go` (`RedactAPIMessage`, `RedactMapValues`), which the previous leaf-package task deferred due to its `claude` dependency.

## Tasks

- [x] Copy `apps/cli/internal/claude/` to `apps/lib/claude/` (claude.go + claude_test.go)
- [x] Copy `apps/cli/internal/session/` to `apps/lib/session/` (session.go, activity.go + tests)
- [x] Copy `apps/cli/internal/redact/message.go` and `message_test.go` to `apps/lib/redact/`, updating the `claude` import to `github.com/driangle/vibeview/lib/claude`
- [x] Update `claude` imports to reference `github.com/driangle/vibeview/lib/logutil`
- [x] Update `session` imports to reference `github.com/driangle/vibeview/lib/claude`, `lib/pathutil`, `lib/logutil`
- [x] Verify: `cd apps/lib && go build ./... && go test ./...`

## Acceptance Criteria

- `claude` and `session` packages compile and all tests pass under `apps/lib/`
- `redact/message.go` is present in `apps/lib/redact/` and imports `lib/claude` (no `internal/`)
- `session.Index`, `claude.ParseSessionFile`, and `claude.Message` are importable from the lib module
- Inter-package imports within `apps/lib/` use the new module path (no `internal/`)
