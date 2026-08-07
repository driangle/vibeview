---
title: "Retain per-message usage and add dimension aggregation in lib"
id: "01kz3q60q"
status: completed
priority: critical
type: feature
phase: "usage-improvements"
dependencies: []
tags: ["usage", "analytics", "backend"]
created: "2026-08-03"
parent: 01kz3q22m
completed_at: 2026-08-06
---

# Retain per-message usage and add dimension aggregation in lib

## Objective

Stop discarding per-message token usage during session enrichment and add the
aggregation primitives that every later task in this phase builds on. Today the
parser already reads per-message `usage` (input/output/cache-creation/cache-read)
and per-message `model`, but enrichment collapses everything into per-session
totals — losing the granularity needed for by-window, by-model, and by-dimension
analytics. This task is the foundation for `vibeview usage`, attribution, the web
page, and cost estimation.

## Context (file:line)

- `apps/lib/claude/claude.go:250-257` — `Usage` struct (four token counters).
- `apps/lib/claude/claude.go:186-208` — `APIMessage` carries per-message `model` + `*Usage`.
- `apps/lib/session/session.go:18-27` — `UsageTotals`.
- `apps/lib/session/session.go:462-477` and `:748-763` — enrichment loops that
  collapse usage and set `meta.Model` to the **first-seen** model (bug: multi-model
  sessions lose per-model attribution).

## Tasks

- [x] Introduce a per-message usage record (timestamp, model, input/output/cache
      tokens, session id, project/dir) — either in `apps/lib/session` or a new
      `apps/lib/usage` package. Aggregate while scanning; do not hold all messages
      in memory.
- [x] Fix per-model attribution: sum tokens keyed by each message's own `model`,
      not the session's first-seen model.
- [x] Add aggregation functions: by time-bucket (hour / day / arbitrary rolling
      window), by model, by project/dir, by session.
- [x] Expose a small, explicit API surface (inputs/outputs documented) so the CLI
      and server can consume it without re-parsing.
- [x] Unit tests for each aggregation (behavior-focused): multi-model session
      splits correctly, rolling-window bucketing is correct at boundaries, empty
      input is handled.

## Acceptance Criteria

- Per-message usage is available to callers without re-scanning JSONL.
- Tokens are correctly attributed per model for mixed-model sessions (no collapse
  to first-seen model).
- Aggregation by hour/day/rolling-window/model/project/session is covered by tests.
- `make check` passes.
