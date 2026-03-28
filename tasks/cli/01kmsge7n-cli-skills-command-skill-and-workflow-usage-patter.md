---
title: "CLI skills command — skill and workflow usage patterns"
id: "01kmsge7n"
status: pending
priority: low
type: feature
tags: ["cli", "aggregate"]
created: "2026-03-28"
---

# CLI skills command — skill and workflow usage patterns

## Objective

Add a `vibeview skills [folder]` command that shows skill and workflow usage patterns across sessions. Helps users see which slash commands and skills they rely on most. Also accepts an individual `.jsonl` session file for single-session analysis. When no folder is provided, default to `CLAUDE_CONFIG_DIR` env var or `~/.claude`.

## Tasks

- [ ] Add `skills` cobra command with optional folder positional arg
- [ ] Implement folder defaulting logic: positional arg → CLAUDE_CONFIG_DIR env → ~/.claude
- [ ] Support individual .jsonl session file as input (analyze a single session)
- [ ] Aggregate skill invocation counts across all sessions
- [ ] Rank most-used skills (commit, review-pr, etc.)
- [ ] Show skill usage frequency over time
- [ ] Format as ranked table in terminal output
- [ ] Add --json and --yaml output format flags
- [ ] Add --dirs flag for project directory filtering
- [ ] Add --top N flag to limit results (default 10)
- [ ] Write tests for skill aggregation logic

## Acceptance Criteria

- [ ] `vibeview skills` works with no arguments (defaults to ~/.claude or CLAUDE_CONFIG_DIR)
- [ ] `vibeview skills /path/to/project` filters to sessions for that project
- [ ] `vibeview skills /path/to/session.jsonl` analyzes a single session file
- [ ] Output shows ranked skill usage counts
- [ ] Output shows skill usage over time
- [ ] --json flag outputs structured JSON
- [ ] Tests cover skill aggregation logic
