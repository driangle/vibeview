---
title: "Implement Claude Code JSONL parser"
id: "01kkqx2e3"
status: pending
priority: critical
effort: medium
type: feature
tags: ["backend", "parser"]
phase: "foundation"
dependencies: ["01kkqwvz9"]
created: "2026-03-15"
---

# Implement Claude Code JSONL parser

## Objective

Build the JSONL parser for Claude Code data files. This includes parsing both `history.jsonl` (session index) and individual session JSONL files with all message types (user, assistant, progress, system, file-history-snapshot).

## Tasks

- [ ] Define Go types for session index entries (sessionId, project, display, timestamp)
- [ ] Define Go types for session messages: user, assistant, progress, system, file-history-snapshot
- [ ] Define Go types for content blocks: text, tool_use, thinking, tool_result
- [ ] Define Go types for usage/cost data (input_tokens, output_tokens, cache_creation_input_tokens, cache_read_input_tokens)
- [ ] Implement history.jsonl line parser that reads session index entries
- [ ] Implement session JSONL line parser that reads message objects
- [ ] Implement project path encoding/decoding (replace `/` with `-`)
- [ ] Write unit tests for parsing real-world JSONL samples

## Acceptance Criteria

- Can parse history.jsonl entries into typed structs
- Can parse all message types from session JSONL files
- Handles malformed lines gracefully (skip and log, don't crash)
- Project path encoding correctly maps `/Users/foo/myproject` to `-Users-foo-myproject`
- Unit tests cover all message types and edge cases
