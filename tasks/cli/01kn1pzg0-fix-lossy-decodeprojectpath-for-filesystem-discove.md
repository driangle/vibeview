---
title: "Fix lossy DecodeProjectPath for filesystem-discovered sessions"
id: "01kn1pzg0"
status: completed
priority: medium
type: bug
tags: ["discovery", "sdk"]
created: "2026-03-31"
---

# Fix lossy DecodeProjectPath for filesystem-discovered sessions

## Objective

When sessions are discovered via filesystem scan (not in `history.jsonl`), the project path is derived using `claude.DecodeProjectPath(dirName)` which replaces all hyphens with slashes. This is lossy: a directory like `-Users-german.greiner-workplace-foo` decodes to `/Users/german.greiner/workplace/foo` correctly only if the original path had no hyphens. Paths containing hyphens (e.g., `/Users/german.greiner/my-project`) get mangled (`/Users/german.greiner/my/project`).

The displayed project path must match a real filesystem path, not a garbled one.

## Steps to Reproduce

1. Have a project at a path containing hyphens or dots (e.g., `/Users/german.greiner/workplace/foo`)
2. Launch a Claude Code session via the SDK (no `history.jsonl` entry)
3. Run `vibeview inspect <session-id>`
4. The `Project` field shows `/Users/german/greiner/workplace/foo` — a non-existent path

## Expected Behavior

The `Project` field shows the actual filesystem path (e.g., `/Users/german.greiner/workplace/foo`).

## Actual Behavior

`DecodeProjectPath` replaces every `-` with `/`, producing invalid paths when the original contained `.`, `-`, `_`, or other non-alphanumeric characters that were also mapped to `-` by `EncodeProjectPath`.

## Root Cause

`EncodeProjectPath` maps all non-alphanumeric characters to `-`, making the encoding non-invertible. `DecodeProjectPath` naively replaces all `-` with `/`, which only works when the original path contained no hyphens, dots, underscores, etc.

## Tasks

- [x] For filesystem-discovered sessions, resolve the actual project path by checking which decoded path candidates exist on disk (e.g., try the decoded path, then check if the encoded dir name matches any known project)
- [x] Consider reading the first message in the session JSONL to extract the actual project path from session metadata if available
- [x] Update `ScanProjectDirs` to populate `SessionMeta.Project` with the verified path
- [x] Add tests covering paths with hyphens, dots, underscores, and spaces

## Acceptance Criteria

- Filesystem-discovered sessions display the correct, existing project path
- Paths with hyphens, dots, and underscores are resolved correctly
- If the real path cannot be determined, the encoded directory name is shown as-is rather than a garbled decode
- Existing history-based discovery is not affected (it uses the project path from history.jsonl)
