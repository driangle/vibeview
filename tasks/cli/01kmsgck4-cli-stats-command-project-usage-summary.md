---
title: "CLI stats command — project usage summary"
id: "01kmsgck4"
status: pending
priority: high
type: feature
tags: ["cli", "aggregate"]
created: "2026-03-28"
---

# CLI stats command — project usage summary

## Objective

Add a `vibeview stats [folder]` command that outputs an aggregate project usage summary across all sessions. Also accepts an individual `.jsonl` session file for single-session analysis. When no folder is provided, default to `CLAUDE_CONFIG_DIR` env var or `~/.claude`.

## Tasks

- [ ] Add `stats` cobra command with optional folder positional arg
- [ ] Implement folder defaulting logic: positional arg → CLAUDE_CONFIG_DIR env → ~/.claude
- [ ] Support individual .jsonl session file as input (analyze a single session)
- [ ] Aggregate session data: total sessions, messages, cost, tokens
- [ ] Compute date range (first session → last session)
- [ ] Compute model usage breakdown (session count and cost per model)
- [ ] Compute average session duration and cost
- [ ] Implement ASCII-formatted terminal output (table/summary style)
- [ ] Add --json and --yaml output format flags
- [ ] Add --dirs flag support for filtering to specific project directories
- [ ] Write tests for aggregation logic

## Acceptance Criteria

- [ ] `vibeview stats` works with no arguments (defaults to ~/.claude or CLAUDE_CONFIG_DIR)
- [ ] `vibeview stats /path/to/project` filters to sessions for that project
- [ ] `vibeview stats /path/to/session.jsonl` analyzes a single session file
- [ ] Output shows total sessions, messages, cost, tokens
- [ ] Output shows date range of sessions
- [ ] Output shows model usage breakdown
- [ ] Output shows average session duration and cost
- [ ] --json flag outputs structured JSON
- [ ] Tests cover aggregation logic
