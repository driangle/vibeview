---
title: "CLI flag to filter session directories on startup"
id: "01kktp9jr"
status: completed
priority: medium
type: feature
tags: ["cli", "filtering"]
created: "2026-03-16"
---

# CLI flag to filter session directories on startup

## Objective

Add a CLI flag (e.g. `-dirs`) that lets the user specify which Claude session directories to include when starting the server in default (non-standalone) mode. Currently the server discovers all sessions under `~/.claude/projects/`. This flag would let users restrict discovery to specific project subdirectories within that path, so only sessions from those directories are indexed and shown in the UI.

This is about filtering which `~/.claude/projects/<encoded_project_name>` directories are scanned — not about changing the Claude config directory itself (which `-claude-dir` already handles).

## Tasks

- [x] Add a new `-dirs` (or similar) repeated/comma-separated string flag to `main.go` that accepts directory names or paths relative to the projects directory
- [x] Pass the filter list through `server.Config` to the session discovery layer
- [x] Update session discovery in `session.go` to only scan the specified project directories when the flag is provided (scan all when omitted for backwards compatibility)
- [x] Update the file watcher to only watch filtered directories
- [x] Add usage documentation to `-help` output

## Acceptance Criteria

- Running `vibeview -dirs projectA,projectB` only shows sessions from those project directories
- Omitting `-dirs` retains current behavior (all directories scanned)
- Invalid directory names are reported as warnings without crashing
- The flag works alongside existing flags like `-port` and `-claude-dir`
