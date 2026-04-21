---
title: "Fix stale model/usage in server session index"
id: "01kpnsw0x"
status: pending
priority: medium
type: bug
tags: ["index", "server", "watcher"]
created: "2026-04-20"
---

# Fix stale model/usage in server session index

## Steps to Reproduce

1. Start `vibeview serve` while no Claude Code session is active.
2. Launch an SDK-entrypoint session (e.g. via agentrunner/skival) that writes a few
   non-assistant lines first (queue-operation, user, attachment) before the first
   assistant message lands.
3. Wait until the session finishes.
4. Open the web UI and look at the session list / SessionView sidebar.
5. Run `vibeview inspect <session-id>` on the same session.

## Expected Behavior

The model badge appears in the session table and the SessionView sidebar, matching
what `vibeview inspect` reports (`claude-opus-4-7`, `claude-haiku-4-5-20251001`, etc.).

## Actual Behavior

For some sessions the web UI shows no model — the `session.model` field returned
by `/api/sessions` and `/api/sessions/{id}` is an empty string, so `ModelBadge`
doesn't render. The CLI's `inspect` command shows the correct model because it
re-parses the file from scratch each invocation.

Reproduced against live data: session `2cf2da8a-ef97-4051-900a-6eebded07bbc` —
CLI reports `claude-opus-4-7` with 59 messages; API returns `model=""` with
`messageCount=11`. At least 50 sessions with the same symptom are currently
visible in `~/.claude/projects/`.

## Root Cause

The server keeps an in-memory index of derived `SessionMeta` fields
(`Model`, `MessageCount`, `Usage`, …) populated by `enrichSession` at startup
(`apps/cli/internal/session/session.go:395`). Two gaps let it go stale:

1. `Broker.enrichNewSession` (`apps/cli/internal/watcher/broker.go:352`) retries
   enrichment with backoff but stops as soon as `MessageCount > 0`. For SDK
   sessions the first lines are `queue-operation` / `user` / `attachment`, so
   the retry loop exits with `Model == ""` before the first assistant message
   is written.
2. Once `MessageCount > 0`, `Index.Enrich` skips the session on subsequent
   passes (`skipEnriched` check), and the tailer in `broker.startTailer` only
   updates `CustomTitle` and `ActivityState` — never `Model`, `MessageCount`,
   or `Usage`. So later assistant messages streamed via SSE never flow back
   into the index.

`handleGetSession` then serves the stale `*meta` through `toSessionResponse`,
so both the list and detail API responses keep returning `model=""` for the
lifetime of the server process.

## Tasks

- [ ] Add an incremental `Index.UpdateFromMessage(sessionID, msg)` (or similar)
      that updates `MessageCount`, sets `Model` when empty on assistant messages,
      and aggregates `Usage` — mirroring the logic in `enrichSession`.
- [ ] Call it from the broker tailer loop in `broker.startTailer`, alongside the
      existing `SetCustomTitle` / `SetActivityState` calls, so actively-streamed
      sessions stay fresh.
- [ ] In `handleGetSession` (`apps/cli/internal/server/server.go:491`), use the
      already-parsed `messages` to refresh the index meta before building the
      response. Sessions viewed in detail will self-heal the list view.
- [ ] Verify the tailer offset invariant: `NewTailer` captures the offset at
      subscribe time, so the tailer only sees lines beyond what
      `enrichSession` already counted — no double-counting of `Usage` /
      `MessageCount`. Add a regression test that exercises this.
- [ ] Unit test: session enriched with only non-assistant messages, tailer
      streams an assistant message → index reflects the model.
- [ ] Unit test: `handleGetSession` refreshes a stale meta.

## Acceptance Criteria

- `/api/sessions` and `/api/sessions/{id}` return the same `model` value that
  `vibeview inspect <id>` reports for the same session, for both actively
  streamed and already-finished sessions.
- No double-counting of `Usage` or `MessageCount` on sessions that had clients
  subscribed during their lifetime.
- `make check` passes (lint, tests, build).
