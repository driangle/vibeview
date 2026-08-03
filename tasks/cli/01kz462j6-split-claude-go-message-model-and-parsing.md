---
id: "01kz462j6"
title: "Split claude.go message model and parsing"
status: pending
priority: medium
type: chore
dependencies: []
tags: ["refactor"]
created_at: 2026-08-03
---

# Split claude.go message model and parsing

## Objective

Split `apps/lib/claude/claude.go` (393 lines) so no resulting file exceeds 200 lines. The file holds the whole Claude Code JSONL data model plus parsing and project-path encoding. Separate the message model from the small supporting types, the line/file parsers, and the path codec. (The `claude` package already has a `linescan.go`, so these siblings fit the existing layout.)

## Tasks

- [ ] Keep in `claude.go` — the core message model: `Message`, `APIMessage`, `ContentBlock`, `Usage`, `ToolUseResult`, `knownMessageKeys`, and their `UnmarshalJSON` methods
- [ ] Create `types.go` — supporting types: `Timestamp` (with `UnmarshalJSON`/`Int64`), `HistoryEntry`, and `MessageType` with its `const` block
- [ ] Create `parse.go` — parsing entry points and result tracking: `ParseHistoryLine`, `ParseMessageLine`, `ParseResult`, `recordMalformed`, `recordOversized`, `ParseHistoryFile`, `ParseSessionFile`
- [ ] Create `projectpath.go` — `EncodeProjectPath`, `DecodeProjectPath`, and `nonAlphanumericPattern`
- [ ] Run `make check` to confirm everything compiles and tests pass

## Acceptance Criteria

- No non-test `.go` file in `apps/lib/claude/` exceeds 200 lines
- Message model, supporting types, parsing, and path encoding live in separate files
- `make check` passes
