---
id: "01kz462an"
title: "Split broker.go in watcher package"
status: pending
priority: medium
type: chore
dependencies: []
tags: ["refactor"]
created_at: 2026-08-03
---

# Split broker.go in watcher package

## Objective

Split `apps/cli/internal/watcher/broker.go` (486 lines) so no resulting file exceeds 200 lines. The file mixes the broker/subscription model with the various background watchers and pollers that feed it. Extract along those seams.

## Tasks

- [ ] Keep in `broker.go` — the `SSEEvent`, `Client`, and `Broker` types plus the subscription lifecycle: `NewBroker`, `Subscribe`, `Unsubscribe`, `Close`
- [ ] Create `watch.go` — the per-session and history file watchers: `startTailer`, `startHistoryWatcher`, `readNewHistoryEntries`, `enrichNewSession`
- [ ] Create `pollers.go` — the periodic loops and event mapping: `startProjectsPoller`, `pingLoop`, their related `const` block, and the `messageEvent` type with `toMessageEvent`
- [ ] Run `make check` to confirm everything compiles and tests pass

## Acceptance Criteria

- No non-test `.go` file in `apps/cli/internal/watcher/` exceeds 200 lines
- Each new file has a single clear responsibility (subscription model / watchers / pollers)
- `make check` passes
