---
title: "CLI files command — file hotspot analysis"
id: "01kmsgda0"
status: pending
priority: high
type: feature
tags: ["cli", "aggregate"]
created: "2026-03-28"
---

# CLI files command — file hotspot analysis

## Objective

Add a `vibeview files [folder]` command that identifies file hotspots — which files are most read, most edited, and touched across the most sessions. Helps users understand where churn is concentrated and which files serve as reference. Also accepts an individual `.jsonl` session file for single-session analysis. When no folder is provided, default to `CLAUDE_CONFIG_DIR` env var or `~/.claude`.

## Tasks

- [ ] Add `files` cobra command with optional folder positional arg
- [ ] Implement folder defaulting logic: positional arg → CLAUDE_CONFIG_DIR env → ~/.claude
- [ ] Support individual .jsonl session file as input (analyze a single session)
- [ ] Aggregate file read counts across all sessions
- [ ] Aggregate file write/edit counts across all sessions
- [ ] Identify files read but never edited (reference/config files)
- [ ] Identify files edited across the most distinct sessions (hotspots)
- [ ] Format as ranked tables in terminal output
- [ ] Add --json and --yaml output format flags
- [ ] Add --dirs flag for project directory filtering
- [ ] Add --top N flag to limit results (default 10)
- [ ] Write tests for file aggregation logic

## Acceptance Criteria

- [ ] `vibeview files` works with no arguments (defaults to ~/.claude or CLAUDE_CONFIG_DIR)
- [ ] `vibeview files /path/to/project` filters to sessions for that project
- [ ] `vibeview files /path/to/session.jsonl` analyzes a single session file
- [ ] Output shows most-read files ranked
- [ ] Output shows most-edited files ranked
- [ ] Output shows read-only reference files
- [ ] Output shows cross-session hotspot files
- [ ] --json flag outputs structured JSON
- [ ] Tests cover file aggregation logic
