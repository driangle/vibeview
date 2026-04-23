---
title: "Extract enrichment logic from session.go"
id: "01kpy106r"
status: pending
priority: low
type: chore
tags: ["refactor"]
created: "2026-04-23"
---

# Extract enrichment logic from session.go

## Objective

Split `apps/cli/internal/session/session.go` (798 lines) by extracting enrichment and standalone-loading logic into a separate file. The enrichment code (`Enrich`, `EnrichN`, `enrichRange`, `enrichSession`) and standalone loading (`LoadFromPaths`, `loadSessionFromFile`) share message-iteration patterns and form a cohesive unit.

## Tasks

- [ ] Create `enrich.go` — move `Enrich`, `EnrichN`, `enrichRange`, `enrichSession`, `EnrichSession`, `LoadFromPaths`, `loadSessionFromFile`, `truncateSlug`, and related constants/regexps (`enrichBatchSize`, `maxWalkDepth`, `commandNamePattern`, `xmlTagPattern`)
- [ ] Verify `session.go` is under 500 lines after extraction
- [ ] Run `make check` to confirm everything compiles and tests pass

## Acceptance Criteria

- `session.go` contains Index type, Discover, ScanProjectDirs, path helpers, and index mutation methods
- `enrich.go` contains all enrichment and standalone-loading logic
- No new files exceed 500 lines
- `make check` passes
