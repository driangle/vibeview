---
title: "Implement session discovery and indexing"
id: "01kkqx55y"
status: pending
priority: critical
effort: medium
type: feature
tags: ["backend", "session"]
phase: "foundation"
dependencies: ["01kkqx2e3"]
created: "2026-03-15"
---

# Implement session discovery and indexing

## Objective

Build the session discovery layer that reads history.jsonl, resolves session file paths using project path encoding, and builds an in-memory index of all sessions with metadata (message count, model, slug).

## Tasks

- [ ] Read and parse `~/.claude/history.jsonl` to get all session entries
- [ ] Resolve each session's JSONL file path using project path encoding
- [ ] Parse each session file to extract metadata: message count, model (from first assistant message), slug
- [ ] Build an in-memory session index with all metadata
- [ ] Support filtering sessions by project path (substring match)
- [ ] Support sorting sessions by timestamp (most recent first)
- [ ] Handle missing or unreadable session files gracefully
- [ ] Write tests for session discovery logic

## Acceptance Criteria

- Discovers all sessions listed in history.jsonl
- Correctly resolves session file paths via project path encoding
- Returns session metadata including messageCount, model, and slug
- Filters by project path work correctly
- Missing session files are skipped without error
