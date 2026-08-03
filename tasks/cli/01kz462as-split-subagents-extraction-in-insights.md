---
id: "01kz462as"
title: "Split subagents extraction in insights"
status: pending
priority: low
type: chore
dependencies: []
tags: ["refactor"]
created_at: 2026-08-03
---

# Split subagents extraction in insights

## Objective

Split `apps/lib/insights/subagents.go` (220 lines) so no resulting file exceeds 200 lines. It is only slightly over — extract the ID-resolution step, which is a distinct concern from extraction.

## Tasks

- [ ] Keep in `subagents.go` — extraction: `agentIDPattern`, `ExtractSubagents`, `extractFromAgentProgress`, `extractFromToolUse`, `extractAgentIDFromResult`
- [ ] Create `subagents_resolve.go` — ID resolution against session directories: `ResolveSubagentIDs`
- [ ] Run `make check` to confirm everything compiles and tests pass

## Acceptance Criteria

- No non-test `.go` file in `apps/lib/insights/` exceeds 200 lines
- Extraction and ID resolution are in separate files
- `make check` passes
