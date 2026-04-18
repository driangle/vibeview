---
title: "Create lib module with leaf packages"
id: "01kpgs1b7"
status: pending
priority: critical
type: chore
tags: ["lib", "phase:1-extract"]
effort: medium
context: ["docs/specs/2026-04-18-extract-go-library.md", "apps/cli/internal/redact/redact.go", "apps/cli/internal/pathutil/pathutil.go", "apps/cli/internal/logutil/logutil.go"]
created: "2026-04-18"
verify:
  - type: bash
    run: "cd apps/lib && go build ./... && go test ./..."
---

# Create lib module with leaf packages

## Objective

Bootstrap the `apps/lib/` Go module and migrate the three leaf packages (`redact`, `pathutil`, `logutil`) that have no in-project dependencies. This establishes the module structure and proves the extraction pattern before touching packages with inter-dependencies.

## Tasks

- [ ] Create `apps/lib/go.mod` with module path `github.com/driangle/vibeview/lib` and Go 1.22.0
- [ ] Copy `apps/cli/internal/logutil/` to `apps/lib/logutil/`
- [ ] Copy `apps/cli/internal/pathutil/` to `apps/lib/pathutil/`
- [ ] Copy `apps/cli/internal/redact/` to `apps/lib/redact/` (including `message.go`)
- [ ] Update import paths from `github.com/driangle/vibeview/internal/...` to `github.com/driangle/vibeview/lib/...`
- [ ] Verify: `cd apps/lib && go build ./... && go test ./...`

## Acceptance Criteria

- `apps/lib/go.mod` exists with correct module path
- All three packages compile and tests pass in the new location
- No `internal/` in any import path within `apps/lib/`
- Packages are importable by external Go modules
