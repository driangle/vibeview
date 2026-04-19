---
title: "CLI errors command — error pattern analysis"
id: "01kmsgdf6"
status: pending
priority: low
type: feature
tags: ["cli", "aggregate"]
created: "2026-03-28"
---

# CLI errors command — error pattern analysis

## Objective

Add a `vibeview errors [folder]` command that surfaces error patterns across sessions. Helps users identify recurring tool failures, common bash command errors, and problematic patterns. Also accepts an individual `.jsonl` session file for single-session analysis. When no folder is provided, default to `CLAUDE_CONFIG_DIR` env var or `~/.claude`.

## Tasks

- [ ] Add `errors` cobra command with optional folder positional arg
- [ ] Implement folder defaulting logic: positional arg → CLAUDE_CONFIG_DIR env → ~/.claude
- [ ] Support individual .jsonl session file as input (analyze a single session)
- [ ] Aggregate tool errors across all sessions grouped by tool name
- [ ] Identify recurring error patterns (similar error snippets)
- [ ] Aggregate bash command failures
- [ ] Show error frequency over time (are errors increasing?)
- [ ] Format as ranked table with error snippets in terminal output
- [ ] Add --json and --yaml output format flags
- [ ] Add --dirs flag for project directory filtering
- [ ] Add --top N flag to limit results (default 10)
- [ ] Write tests for error aggregation logic

## Acceptance Criteria

- [ ] `vibeview errors` works with no arguments (defaults to ~/.claude or CLAUDE_CONFIG_DIR)
- [ ] `vibeview errors /path/to/project` filters to sessions for that project
- [ ] `vibeview errors /path/to/session.jsonl` analyzes a single session file
- [ ] Output shows most common tool errors ranked by frequency
- [ ] Output shows recurring error patterns grouped together
- [ ] Output shows bash command failures
- [ ] --json flag outputs structured JSON
- [ ] Tests cover error aggregation logic
