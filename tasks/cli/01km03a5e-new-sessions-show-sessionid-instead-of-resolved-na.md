---
title: "New sessions show sessionId instead of resolved name (slug)"
id: "01km03a5e"
status: pending
priority: high
type: bug
tags: ["session", "watcher"]
created: "2026-03-18"
---

# New sessions show sessionId instead of resolved name (slug)

## Steps to Reproduce

1. Start a new Claude Code session (so a new entry is appended to `~/.claude/history.jsonl`)
2. Open the VibeView web UI — the new session appears in the session table
3. Observe the session name column

## Expected Behavior

The session should display a human-readable name derived from the first user message (the `slug` field), or the `customTitle` if one has been set via `/rename`.

## Actual Behavior

The session always displays the raw `sessionId` (UUID) because the `slug` field is never populated for sessions added at runtime.

## Root Cause

When the history watcher detects a new session, `Index.AddSession()` in `apps/cli/internal/session/session.go:281-296` only populates `SessionID`, `Project`, and `Timestamp`. It never calls `enrichSession()` to extract the slug (from the first user message), model, messageCount, or usage data. The frontend display logic (`customTitle || slug || id` in `SessionRow.tsx:52`) falls through to `id`.

## Tasks

- [ ] Call enrichment logic (or a subset of it) when a new session is added via `AddSession()` or shortly after
- [ ] Handle the case where the session JSONL file may not yet contain the first user message (the file is still being written to) — consider a retry/delayed enrichment mechanism
- [ ] Ensure the broker's SSE stream or a session-list update event notifies the frontend when the slug becomes available
- [ ] Verify that model and messageCount are also populated for new sessions

## Acceptance Criteria

- When a new Claude Code session starts, the session table shows the slug (first user message text) within a few seconds, not the sessionId
- If the user renames the session via `/rename`, the customTitle is displayed instead
- Model and message count columns are also populated for new sessions
- No regression for sessions loaded during initial startup (existing enrichment path)
