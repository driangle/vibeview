---
title: "Scaffold Go project and CLI entrypoint"
id: "01kkqwvz9"
status: completed
priority: critical
effort: small
type: chore
tags: ["backend", "cli"]
phase: "foundation"
created: "2026-03-15"
---

# Scaffold Go project and CLI entrypoint

## Objective

Set up the Go module, directory structure, and CLI entrypoint with flag parsing. This is the foundation everything else builds on.

## Tasks

- [x] Initialize Go module (`go mod init`)
- [x] Create directory structure: `cmd/vibeview/`, `internal/server/`, `internal/session/`, `internal/claude/`
- [x] Implement CLI flag parsing: `--port` (default 1337), `--claude-dir` (default ~/.claude), `--open` (default true)
- [x] Wire up basic main() that parses flags and prints startup info
- [x] Add a placeholder HTTP server start (will be implemented in a later task)

## Acceptance Criteria

- `go build ./cmd/vibeview` produces a binary
- Binary accepts `--port`, `--claude-dir`, and `--open` flags
- `--help` shows usage information
- Directory structure matches the spec architecture diagram
