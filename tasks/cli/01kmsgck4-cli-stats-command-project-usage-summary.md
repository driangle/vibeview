---
title: "CLI stats command — project usage summary"
id: "01kmsgck4"
status: completed
priority: high
type: feature
tags: ["cli", "aggregate"]
created: "2026-03-28"
---

# CLI stats command — project usage summary

## Objective

Add a `vibeview stats [folder]` command that outputs an aggregate project usage summary across all sessions. Also accepts an individual `.jsonl` session file for single-session analysis. When no folder is provided, default to `CLAUDE_CONFIG_DIR` env var or `~/.claude`.

## Tasks

- [x] Add `stats` cobra command with optional folder positional arg
- [x] Implement folder defaulting logic: positional arg → CLAUDE_CONFIG_DIR env → ~/.claude
- [x] Support individual .jsonl session file as input (analyze a single session)
- [x] Aggregate session data: total sessions, messages, cost, tokens
- [x] Compute date range (first session → last session)
- [x] Compute model usage breakdown (session count and cost per model)
- [x] Compute average session duration and cost
- [x] Implement ASCII-formatted terminal output (table/summary style)
- [x] Add --json and --yaml output format flags
- [x] Add --dirs flag support for filtering to specific project directories
- [x] Write tests for aggregation logic

## Acceptance Criteria

- [x] `vibeview stats` works with no arguments (defaults to ~/.claude or CLAUDE_CONFIG_DIR)
- [x] `vibeview stats /path/to/project` filters to sessions for that project
- [x] `vibeview stats /path/to/session.jsonl` analyzes a single session file
- [x] Output shows total sessions, messages, cost, tokens
- [x] Output shows date range of sessions
- [x] Output shows model usage breakdown
- [x] Output shows average session duration and cost
- [x] --json flag outputs structured JSON
- [x] Tests cover aggregation logic
