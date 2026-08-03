---
title: "Split session.go into focused files (under 200 lines)"
id: "01kpy106r"
status: pending
priority: low
type: chore
tags: ["refactor"]
created: "2026-04-23"
---

# Split session.go into focused files (under 200 lines)

## Objective

Split `apps/lib/session/session.go` (812 lines) so no resulting file exceeds 200 lines. The file holds the index type and accessors, discovery, directory filtering, enrichment, index mutation, and standalone loading. A single extraction is not enough — break it into cohesive files by concern.

## Tasks

- [ ] Keep in `session.go` — core types and index accessors: `UsageTotals`, `SessionMeta`, `ProcessChecker`, `Index`, `SetProcessChecker`, `GetSessions`, `FindSession`, `FindSessionByPrefix`, `SetCustomTitle`, `ActiveSessionIDs`, `SetActivityState`
- [ ] Create `discover.go` — discovery and directory filtering: `Discover`, `ScanProjectDirs`, `DirFilter`, `NewDirFilter`, `Matches`, `warnUnmatchedDirs`
- [ ] Create `enrich.go` — enrichment orchestration: `Enrich`, `EnrichN`, `enrichRange`, and `enrichBatchSize`
- [ ] Create `enrichsession.go` — per-session enrichment: `enrichSession`, `EnrichSession`, `SessionFilePath`, plus related constants/regexps (`maxWalkDepth`, `commandNamePattern`, `xmlTagPattern`)
- [ ] Create `mutate.go` — index mutation and lookup: `AddSessionMeta`, `AddSession`, `FilterByProject`, `ResolveFilePath`
- [ ] Create `load.go` — standalone loading: `LoadFromPaths`, `loadSessionFromFile`, `truncateSlug`
- [ ] Run `make check` to confirm everything compiles and tests pass

## Acceptance Criteria

- No non-test `.go` file in `apps/lib/session/` exceeds 200 lines
- `session.go` contains the `Index` type and accessor methods only
- Discovery, enrichment, mutation, and standalone loading are in their own files
- `make check` passes
