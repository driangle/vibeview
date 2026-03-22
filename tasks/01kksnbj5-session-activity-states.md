---
title: "Detect session activity states"
id: "01kksnbj5"
status: completed
priority: medium
type: feature
tags: ["sessions", "state-detection"]
created: "2026-03-15"
---

# Detect session activity states

## Objective

Derive and expose a session activity state so users can see at a glance whether a session is actively working, waiting for tool approval, waiting for user input, or idle. States are inferred from the session's recent message history and timestamps.

### State Definitions

- **Working** — the last message is an assistant message with tool use, or a progress message, and recent activity (within ~30s)
- **Waiting for approval** — the last assistant message contains a `tool_use` content block but no corresponding `tool_result` user message has followed yet
- **Waiting for input** — the last message is an assistant message with only text content (no tool use), indicating Claude is waiting for the user to respond
- **Idle** — no new messages for a configurable threshold (e.g. 5+ minutes)

## Tasks

- [x] Add an `ActivityState` type/enum with values: `working`, `waiting_for_approval`, `waiting_for_input`, `idle`
- [x] Implement state derivation logic in the session package that examines the last few messages and their timestamps to determine the current state
- [x] Add an `activityState` field to `SessionMeta` and populate it during session indexing/enrichment
- [x] Update the `/api/sessions` response to include the `activityState` field
- [x] Keep activity state up to date for live sessions via the file tailer/watcher
- [x] Display the activity state in the web UI session table with appropriate visual indicators (e.g. colored badges)
- [x] Add an optional filter on the sessions list to filter by activity state

## Acceptance Criteria

- Each session in the API response includes an `activityState` field with one of: `working`, `waiting_for_approval`, `waiting_for_input`, `idle`
- A session whose last assistant message has an unanswered `tool_use` block shows as `waiting_for_approval`
- A session whose last message is assistant text (no tool use) shows as `waiting_for_input`
- A session with recent activity (assistant tool use with a following tool result, or progress messages) shows as `working`
- A session with no activity for 5+ minutes shows as `idle`
- The session table displays the state with a visual indicator
- Activity state updates in near-real-time for live sessions
