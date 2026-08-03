---
id: "cf-013"
title: "Add backend tests for the untested critical paths"
status: completed
priority: high
effort: medium
type: chore
tags: [testing, backend, security]
group: critical-feedback
phase: critical-feedback
touches: ["cli/server", "cli/watcher"]
created: 2026-08-03
dependencies: ["cf-001", "cf-006"]
context:
  - "apps/cli/internal/server/server_test.go"
  - "apps/cli/internal/watcher/broker_test.go"
completed_at: 2026-08-03
---

# Add backend tests for the untested critical paths

## Findings

Test breadth is good for the list/filter/CORS/auth surface, but the untested code is
exactly the risky code:

- **`handleGetSubagent` has zero tests.** No test references `subagent`, `agentId`, or
  traversal at the server layer — the most security-sensitive endpoint (cf-001) and its
  helper `resolveToolUseAgentID` are entirely unexercised, and the `pathutil` traversal
  hardening is never wired into an HTTP test.
- **The SSE handler is only tested for its 404 case** (`TestGetSessionStreamNotFound`,
  server_test.go:909). No test verifies that a tailer append propagates through the broker
  to a subscribed client, nor client-cap enforcement, ping/idle-decay, or `stream_error`
  delivery.
- **No oversized-line test** (the 2 MB `ErrTooLong` behavior from cf-006).
- **No HTTP-layer traversal/symlink test** for `handleGetSession` or `handleGetSubagent`.

## Acceptance Criteria

- [x] `handleGetSubagent` tests: happy path, `tool_use_` resolution, and traversal payloads
- [x] SSE end-to-end test: append → broker → subscribed client receives the message; plus client-cap enforcement and idle-decay
- [x] Oversized-line test for the parser and tailer (pairs with cf-006)
- [x] Symlink/traversal tests at the HTTP layer for both read endpoints

## verify
```yaml
verify:
  - type: bash
    run: "go test -race -cover ./..."
    dir: "apps/cli"
  - type: assert
    check: "handleGetSubagent, the SSE propagation path, and oversized-line handling all have passing tests"
```
