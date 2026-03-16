---
title: "Fix session name to show first user message or custom title"
id: "01kksnex1"
status: pending
priority: high
type: bug
tags: ["sessions", "ui"]
created: "2026-03-15"
---

# Fix session name to show first user message or custom title

## Steps to Reproduce

1. Open the sessions list page
2. Observe the "Session" column — most sessions display the raw `sessionId` (UUID) as the name

## Expected Behavior

The session name should display in this priority order:
1. `customTitle` — if the user has renamed the session (via `/rename`)
2. `slug` — the first user message text (already stored in `SessionMeta.Slug`, truncated)
3. `id` — fall back to session ID only if neither is available

## Actual Behavior

Most sessions show the raw session ID (UUID) instead of meaningful names, even when `slug` (first user message) and `customTitle` data are available.

## Tasks

- [x] Investigate why `slug` and `customTitle` are not being used as the display name in the session table
- [x] Update the session name display logic in `SessionRow.tsx` to prefer `customTitle` > `slug` > `id`
- [x] Verify that `slug` is being correctly populated during session indexing (first user message text)
- [x] Verify that `customTitle` from `custom-title` JSONL messages is being parsed and stored

## Acceptance Criteria

- Sessions with a `customTitle` display that title as the session name
- Sessions without a `customTitle` display the first user message text (truncated) as the session name
- Only sessions with neither a custom title nor a first user message fall back to showing the session ID
- The fix applies to both the session list and any other places the session name is shown
