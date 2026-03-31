---
title: "SDK-launched sessions missing from vibeview"
id: "01kn11ey7"
status: pending
priority: high
type: bug
tags: ["discovery", "sdk"]
created: "2026-03-31"
---

# SDK-launched sessions missing from vibeview

## Steps to Reproduce

1. Launch a Claude Code session via the SDK (e.g., `agentrunner` with `entrypoint: "sdk-cli"`)
2. The session JSONL file is created at `~/.claude/projects/{encoded-path}/{session-id}.jsonl`
3. Run `vibeview inspect <session-id>` or open the vibeview web interface
4. The session is not found

## Expected Behavior

All Claude Code sessions — whether started from the CLI or the SDK — should be discoverable in vibeview's web interface, search, and `inspect` command.

## Actual Behavior

Sessions launched via the SDK (`"entrypoint":"sdk-cli"`) are never recorded in `~/.claude/history.jsonl`. Since `session.Discover()` relies exclusively on `history.jsonl` for session discovery, these sessions are completely invisible to vibeview.

**Example missing session:**
`~/.claude/projects/-Users-driangle-workplace-gg-agentrunner-examples-ts-channel/2479379e-279e-44e7-aef1-8cf4bf1373e4.jsonl`

## Root Cause

`session.Discover()` (`apps/cli/internal/session/session.go:121`) reads only `~/.claude/history.jsonl` to build the session index. Claude Code's CLI writes an entry to `history.jsonl` on each session start, but the SDK entrypoint does not. There is no fallback filesystem scan of `~/.claude/projects/` to catch sessions missing from the history file.

## Tasks

- [ ] Add a filesystem-based discovery pass that scans `~/.claude/projects/*/` for `.jsonl` files not already present in the history-based index
- [ ] Merge filesystem-discovered sessions into the `Index` returned by `Discover()`, deriving metadata (project path, timestamp) from the file path and file contents
- [ ] Update the watcher (`watcher/broker.go`) to also watch for new `.jsonl` files appearing in `~/.claude/projects/` directories, not just new lines in `history.jsonl`
- [ ] Ensure `vibeview inspect <session-id>` can find sessions via filesystem scan when they're absent from `history.jsonl`
- [ ] Add tests for filesystem-based discovery (sessions present on disk but missing from history)

## Acceptance Criteria

- Sessions created via the SDK (not in `history.jsonl`) appear in the vibeview web interface session list
- `vibeview inspect <session-id>` succeeds for SDK-launched sessions
- `vibeview search` includes results from SDK-launched sessions
- Existing history.jsonl-based discovery continues to work unchanged
- New filesystem-discovered sessions are picked up by the watcher in real time
- Tests cover the filesystem discovery path
