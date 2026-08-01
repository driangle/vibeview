---
title: "Create lib module with leaf packages"
id: "01kpgs1b7"
status: completed
priority: critical
type: chore
tags: ["lib", "phase:1-extract"]
effort: medium
context: ["docs/specs/2026-04-18-extract-go-library.md", "apps/cli/internal/redact/redact.go", "apps/cli/internal/pathutil/pathutil.go", "apps/cli/internal/logutil/logutil.go"]
created: "2026-04-18"
verify:
  - type: bash
    run: "cd apps/lib && go build ./... && go test ./..."
completed_at: 2026-08-01
---

# Create lib module with leaf packages

## Objective

Bootstrap the `apps/lib/` Go module and migrate the three leaf packages (`redact`, `pathutil`, `logutil`) that have no in-project dependencies. This establishes the module structure and proves the extraction pattern before touching packages with inter-dependencies.

Note: `redact/message.go` (`RedactAPIMessage`, `RedactMapValues`) depends on the `claude` package, so it is **not** part of this task — it migrates in `01kpgs201` alongside `claude`. Only the stdlib-only `redact.go` moves here, keeping this task's packages truly leaf.

## Tasks

- [x] Create `apps/lib/go.mod` with module path `github.com/driangle/vibeview/lib` and Go 1.22.0
- [x] Copy `apps/cli/internal/logutil/` to `apps/lib/logutil/`
- [x] Copy `apps/cli/internal/pathutil/` to `apps/lib/pathutil/`
- [x] Copy `apps/cli/internal/redact/redact.go` and `redact_test.go` to `apps/lib/redact/` (exclude `message.go` / `message_test.go` — they depend on `claude`)
- [x] Update import paths from `github.com/driangle/vibeview/internal/...` to `github.com/driangle/vibeview/lib/...` (n/a — leaf packages are stdlib-only, no in-project imports)
- [x] Verify: `cd apps/lib && go build ./... && go test ./...`

## Acceptance Criteria

- `apps/lib/go.mod` exists with correct module path
- All three packages compile and tests pass in the new location
- No `internal/` in any import path within `apps/lib/`
- `apps/lib/` has no dependency on any package still under `apps/cli/internal/` (i.e. `redact` is stdlib-only)
- Packages are importable by external Go modules
