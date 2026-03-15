---
title: "Support standalone JSONL file and directory viewing"
id: "01kkryty3"
status: completed
priority: high
type: feature
tags: ["cli", "ux"]
created: "2026-03-15"
---

# Support standalone JSONL file and directory viewing

## Objective

Allow users to view arbitrary JSONL conversation files and directories outside of `~/.claude` by passing them as CLI arguments. When files or directories are provided, vibeview shows only those sessions (no merge with `~/.claude`). When no args are given, the current behavior (scan `~/.claude`) is preserved.

## Tasks

- [x] Accept positional args in `main.go` as file paths or directory paths
- [x] When a directory is provided, recursively scan it for `*.jsonl` files
- [x] For each JSONL file, parse it with `claude.ParseSessionFile()` and synthesize a `SessionMeta` (derive ID from filename, timestamp from first message, slug from first user message, model from assistant messages)
- [x] Add a `session.LoadFromPaths(paths []string) (*Index, error)` function that handles both files and directories
- [x] When positional args are present, use `LoadFromPaths` instead of `Discover` — do not merge with `~/.claude` sessions
- [x] When no positional args are present, preserve current behavior (`Discover` from `--claude-dir`)
- [ ] If `--port` is already in use, print a helpful message and exit (don't silently fail)
- [x] Wire up the watcher/tailer so live-tailing works for standalone files too
- [x] Skip files that fail to parse (log a warning, don't abort)

## Acceptance Criteria

- `vibeview session.jsonl` starts a server showing only that session
- `vibeview /path/to/dir/` recursively finds and displays all valid JSONL sessions in that directory
- `vibeview a.jsonl b.jsonl /some/dir` combines files and directory scanning
- No `~/.claude` sessions are shown when file/directory args are provided
- `vibeview` with no args works exactly as before (scans `~/.claude`)
- Invalid JSONL files are skipped with a warning, not a crash
- `--port` flag still works for all modes
- Live-tailing (SSE) works for standalone files
