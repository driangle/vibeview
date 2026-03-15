---
title: "Implement file watching and SSE streaming"
id: "01kkqx6s6"
status: pending
priority: high
effort: medium
type: feature
tags: ["backend", "realtime"]
phase: "core"
dependencies: ["01kkqx60d"]
created: "2026-03-15"
---

# Implement file watching and SSE streaming

## Objective

Add real-time file watching using fsnotify and implement the SSE streaming endpoint. Watch both history.jsonl for new sessions and individual session JSONL files for new messages, pushing updates to connected clients.

## Tasks

- [ ] Add `fsnotify` dependency
- [ ] Watch `history.jsonl` for new session entries (detect appended lines)
- [ ] Watch active session JSONL files for new messages (track file position, read new lines)
- [ ] Implement `GET /api/sessions/:id/stream` SSE endpoint
- [ ] Emit `message` events with parsed message JSON when new lines are appended
- [ ] Emit `ping` events every 30s to keep connections alive
- [ ] Handle client disconnection gracefully (clean up watchers)
- [ ] Update session index when new sessions appear in history.jsonl
- [ ] Write tests for file tail/watch logic

## Acceptance Criteria

- New messages appended to a session JSONL file are pushed to SSE clients within 1s
- New sessions in history.jsonl are detected and added to the index
- SSE connections receive ping events every 30s
- Disconnected clients are cleaned up without leaking goroutines
- Multiple concurrent SSE clients for the same session all receive updates
