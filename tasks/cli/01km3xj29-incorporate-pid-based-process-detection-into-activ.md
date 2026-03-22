---
title: "Incorporate PID-based process detection into activity state logic"
id: "01km3xj29"
status: completed
priority: high
type: feature
tags: ["sessions", "activity"]
created: "2026-03-19"
---

# Incorporate PID-based process detection into activity state logic

## Objective

Improve activity state accuracy by incorporating OS process detection via Claude Code's PID files (`~/.claude/sessions/{PID}.json`). Currently, `DeriveActivityState` in `apps/cli/internal/session/activity.go` relies solely on message history heuristics (last message type + 5-minute idle timeout). This can produce false positives — e.g., showing a session as "working" when the Claude Code process has actually crashed or been killed. By cross-referencing with PID liveness, sessions with no running process are reliably marked as `idle`.

## Context

- Claude Code writes `~/.claude/sessions/{PID}.json` files containing `{ pid, sessionId, cwd, startedAt }` for each running CLI process
- These files are not always cleaned up on exit (stale files are expected)
- Process liveness can be checked with `syscall.Kill(pid, 0)` (signal 0) on Unix

## Tasks

- [ ] Add a function to scan `~/.claude/sessions/*.json` and build a map of `sessionId → pid` for live processes (verified via `syscall.Kill(pid, 0)`)
- [ ] Integrate the PID liveness check into the activity state derivation — if no live process exists for a session, force state to `idle` regardless of message heuristics
- [ ] Wire the PID check into the broker/indexer so it's available during both initial enrichment and real-time SSE updates
- [ ] Handle edge cases: stale PID files, PID reuse (compare `startedAt` if needed), permission errors on `kill -0`
- [ ] Add tests for the PID scanning and the combined activity state logic

## Acceptance Criteria

- A session whose Claude Code process is no longer running is always reported as `idle`
- A session with a live process continues to use message-based heuristics for fine-grained state (`working`, `waiting_for_approval`, `waiting_for_input`)
- Stale PID files (process exited) do not cause false "working" states
- The PID check does not introduce noticeable latency on the session list or SSE stream
