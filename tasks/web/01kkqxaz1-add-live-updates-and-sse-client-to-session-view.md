---
title: "Add live updates and SSE client to session view"
id: "01kkqxaz1"
status: completed
priority: high
effort: medium
type: feature
tags: ["frontend", "realtime"]
phase: "core"
dependencies: ["01kkqxa68", "01kkqx6s6"]
created: "2026-03-15"
---

# Add live updates and SSE client to session view

## Objective

Connect the session view page to the SSE streaming endpoint for real-time message updates. New messages should appear automatically as they are appended to the session, with scroll-to-bottom behavior for live sessions.

## Tasks

- [x] Create custom hook for SSE connection using EventSource to `GET /api/sessions/:id/stream`
- [x] Parse incoming SSE `message` events and append to local message state
- [x] Handle SSE `ping` events (keep-alive)
- [x] Implement auto-reconnect on connection drop
- [x] Add scroll-to-bottom behavior when new messages arrive (only if already scrolled to bottom)
- [x] Add visual "live" indicator when SSE connection is active
- [x] Clean up EventSource on component unmount or navigation away
- [x] Handle edge case: messages received via SSE that were already fetched via initial API call

## Acceptance Criteria

- New messages appear in real-time without page refresh
- Scroll position maintained when reading history; auto-scrolls when at bottom
- Visual indicator shows when session is receiving live updates
- SSE connection cleaned up properly on navigation
- Reconnects automatically after connection drops
