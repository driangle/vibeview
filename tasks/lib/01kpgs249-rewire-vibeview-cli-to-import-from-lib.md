---
title: "Rewire vibeview CLI to import from lib"
id: "01kpgs249"
status: completed
priority: critical
type: chore
tags: ["cli", "phase:2-rewire"]
effort: medium
dependencies: ["01kpgs219"]
context: ["docs/specs/2026-04-18-extract-go-library.md", "apps/cli/go.mod", "apps/cli/cmd/vibeview/main.go"]
created: "2026-04-18"
verify:
  - type: bash
    run: "cd apps/cli && go build ./... && go test ./..."
completed_at: 2026-08-01
---

# Rewire vibeview CLI to import from lib

## Objective

Switch the vibeview CLI from using its `internal/` copies to importing from `apps/lib/`. After this task, the CLI consumes its own library — proving the extraction works end-to-end. The migrated `internal/` packages are deleted; only app-specific packages (`server`, `watcher`, `spa`, `settings`, `projects`, `pidcheck`) remain under `internal/`.

## Tasks

- [x] Add `require github.com/driangle/vibeview/lib v0.0.0` to `apps/cli/go.mod`
- [x] Add `replace github.com/driangle/vibeview/lib => ../lib` to `apps/cli/go.mod`
- [x] Update all imports in `apps/cli/cmd/vibeview/` from `github.com/driangle/vibeview/internal/{claude,session,insights,search,redact,pathutil,logutil}` to `github.com/driangle/vibeview/lib/...`
- [x] Update all imports in `apps/cli/internal/server/` to use `lib/...` for the 7 migrated packages
- [x] Update all imports in `apps/cli/internal/watcher/` to use `lib/...`
- [x] Delete `apps/cli/internal/{claude,session,insights,search,redact,pathutil,logutil}/`
- [x] Run `cd apps/cli && go mod tidy`
- [x] Verify: `cd apps/cli && go build ./... && go test ./...`

## Acceptance Criteria

- `apps/cli/internal/` contains only: `server/`, `watcher/`, `spa/`, `settings/`, `projects/`, `pidcheck/`
- CLI compiles, all tests pass, `make check` passes
- No import paths referencing `vibeview/internal/{claude,session,insights,search,redact,pathutil,logutil}` remain
