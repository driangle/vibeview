---
title: "Add 'related' command to group a session with its subagents and time-clustered siblings"
id: "01kz1q1s4"
status: pending
priority: high
type: feature
tags: ["cli", "sessions", "subagents"]
created: "2026-08-02"
---

# Add 'related' command to group a session with its subagents and time-clustered siblings

## Objective

Add a `vibeview related <id>` command that reconstructs a whole multi-agent "work
episode" from a single session ID, instead of viewing one transcript in isolation.
Given a session, it groups:

1. **Subagent transcripts** — the `agent-*.jsonl` files this session spawned (the
   `subagents/` dir; e.g. the "13 Agent calls" example), and
2. **Time-clustered sibling sessions** — other sessions from the **same project**
   whose time windows overlap/cluster with this one (e.g. the dozens of
   `review-story-*` / `review-lawsrulings-*` sessions spawned in the same window).

Today nothing in vibeview connects these; the relationship can only be inferred by
eyeballing timestamps. This is user-reported as the highest-value new capability
for understanding complex, multi-agent sessions.

## Motivation (user feedback)

> This session had a `subagents/` dir (13 Agent calls) and spawned dozens of sibling
> `review-story-*` / `review-lawsrulings-*` sessions in the same window. Nothing in
> vibeview connects them — I only inferred the relationship by eyeballing timestamps.
> A command that groups a session with its subagent transcripts and time-clustered
> siblings from the same project would let you reconstruct a whole work episode, not
> just one file.

## Design Notes (from code exploration)

- **Command shape:** new file `apps/cli/cmd/vibeview/related.go` returning
  `*cobra.Command`, `Args: cobra.ExactArgs(1)`, registered in `main.go` (~line 92-98)
  alongside `showCmd`/`sessionsCmd`. Resolve `<id>` with
  `session.FindSession` / `FindSessionByPrefix` like `show.go:88-115`. Render a
  grouped listing like `sessions.go` (`renderSessionsTable`, `toSessionEntry`) with
  a `--json` variant.
- **Subagent grouping (mostly reuse):** subagents already live at
  `{sessionDir}/subagents/agent-{agentId}.jsonl` (+ `.meta.json`). Extraction logic
  exists in `apps/lib/insights/subagents.go` (`ExtractSubagents`, `ResolveSubagentIDs`)
  but is currently **server-only** — there is no CLI-facing enumerator. Add a small
  `session` helper (e.g. `session.ListSubagents(meta)`) that lists the `subagents/`
  dir and reads `.meta.json` for `agentType`/`description`/turn info. Note `show.go`
  currently skips sidechain messages (`show.go:150-152`), so this is genuinely new
  CLI surface.
- **Sibling clustering (greenfield):** no cross-session lineage exists on
  `SessionMeta` or `claude.Message` (no `parentSessionId`/`leafUuid`). Synthesize at
  query time: `Discover` → `FilterByProject(target.Project)` (`session.go:597`) →
  enrich only that subset (cheap, per the `enrichSessions` pattern in
  `sessions.go:164-176`) → cluster on time.
- **Time-clustering gap:** `SessionMeta` (`session.go:30-45`) exposes only
  `Timestamp` (start-ish, epoch millis) + `DurationMs`; explicit first/last message
  timestamps are computed then discarded (`enrichSession:445-476`). Start =
  `Timestamp`, end ≈ `Timestamp + DurationMs`, but only after `Enrich` and cleanly
  only for history-sourced sessions. Consider adding explicit `StartTime`/`EndTime`
  fields to `SessionMeta` for reliable clustering.

## Tasks

- [ ] Add `related.go` cobra command (`ExactArgs(1)`, resolves ID/prefix via `FindSession`/`FindSessionByPrefix`); register it in `main.go`.
- [ ] Add a `session`-package helper to enumerate a session's subagent transcripts from `{sessionDir}/subagents/agent-*.jsonl` + `.meta.json` (agentType, description, turn/message count), reusing `insights` logic where possible.
- [ ] Gather same-project siblings via `Discover` → `FilterByProject` → enrich-subset, then cluster by time window (define a clustering rule, e.g. sessions overlapping or within a gap threshold of the target's `[start, end]`).
- [ ] Consider adding explicit `StartTime`/`EndTime` to `SessionMeta` (populate in `enrichSession`) for reliable time-clustering; otherwise derive from `Timestamp` + `DurationMs` and document the limitation.
- [ ] Render grouped output: a "Subagents" section and a "Sibling sessions" section (table like `sessions.go`), plus a `--json` structured variant.
- [ ] Add a `--window`/`--gap` flag (and/or `--no-subagents`/`--no-siblings`) to tune the clustering window and scope.
- [ ] Add tests: subagent enumeration for a session with a `subagents/` dir, sibling clustering with fixture sessions in/out of the window, ID-prefix resolution, and `--json` shape.
- [ ] Document the `related` command (help text + docs).

## Acceptance Criteria

- `vibeview related <id>` (accepting an 8-char prefix or full UUID) prints the target session, its subagent transcripts, and time-clustered same-project siblings.
- A session with a `subagents/` dir lists each `agent-*.jsonl` with its agentType/description and turn/message count (e.g. all 13 for the reported session).
- Sibling sessions are limited to the same project and to a defined time window/cluster; sessions outside the window are excluded.
- A `--json` variant emits the grouped structure for scripting (replacing the current pull-all-and-filter-in-Python workaround).
- Clustering window is tunable via a flag, with a sane default.
- Tests cover subagent enumeration, sibling clustering (in/out of window), prefix resolution, and JSON output.
