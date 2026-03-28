---
title: "CLI tools command — tool usage breakdown"
id: "01kmsgd7a"
status: pending
priority: high
type: feature
tags: ["cli", "aggregate"]
created: "2026-03-28"
---

# CLI tools command — tool usage breakdown

## Objective

Add a `vibeview tools [folder]` command that shows aggregate tool usage across all sessions. Helps users understand which tools Claude uses most, which bash commands are common, and where errors occur. Also accepts an individual `.jsonl` session file for single-session analysis. When no folder is provided, default to `CLAUDE_CONFIG_DIR` env var or `~/.claude`.

## Tasks

- [ ] Add `tools` cobra command with optional folder positional arg
- [ ] Implement folder defaulting logic: positional arg → CLAUDE_CONFIG_DIR env → ~/.claude
- [ ] Support individual .jsonl session file as input (analyze a single session)
- [ ] Aggregate tool counts across all sessions (Read, Edit, Bash, Write, etc.)
- [ ] Rank most-executed bash commands across sessions
- [ ] Compute read/write ratio (exploring vs building indicator)
- [ ] Compute error rate per tool (which tools fail most)
- [ ] Format as ranked table in terminal output
- [ ] Add --json and --yaml output format flags
- [ ] Add --dirs flag for project directory filtering
- [ ] Add --top N flag to limit results (default 10)
- [ ] Write tests for tool aggregation logic

## Acceptance Criteria

- [ ] `vibeview tools` works with no arguments (defaults to ~/.claude or CLAUDE_CONFIG_DIR)
- [ ] `vibeview tools /path/to/project` filters to sessions for that project
- [ ] `vibeview tools /path/to/session.jsonl` analyzes a single session file
- [ ] Output shows ranked tool usage counts
- [ ] Output shows most common bash commands
- [ ] Output shows read/write ratio
- [ ] Output shows error rate per tool
- [ ] --json flag outputs structured JSON
- [ ] Tests cover tool aggregation logic
