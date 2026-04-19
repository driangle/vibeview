---
title: "CLI subagents command — agent delegation patterns"
id: "01kmsgdq0"
status: pending
priority: low
type: feature
tags: ["cli", "aggregate"]
created: "2026-03-28"
---

# CLI subagents command — agent delegation patterns

## Objective

Add a `vibeview subagents [folder]` command that shows agent delegation patterns across sessions. Helps users understand how often subagents are spawned, what they're used for, and how much work they do. Also accepts an individual `.jsonl` session file for single-session analysis. When no folder is provided, default to `CLAUDE_CONFIG_DIR` env var or `~/.claude`.

## Tasks

- [ ] Add `subagents` cobra command with optional folder positional arg
- [ ] Implement folder defaulting logic: positional arg → CLAUDE_CONFIG_DIR env → ~/.claude
- [ ] Support individual .jsonl session file as input (analyze a single session)
- [ ] Aggregate subagent spawn count across sessions
- [ ] Group by agent description/type (explore, plan, general-purpose, etc.)
- [ ] Compute average turn count per agent type
- [ ] Show most common agent prompts/descriptions
- [ ] Format as ranked table in terminal output
- [ ] Add --json and --yaml output format flags
- [ ] Add --dirs flag for project directory filtering
- [ ] Write tests for subagent aggregation logic

## Acceptance Criteria

- [ ] `vibeview subagents` works with no arguments (defaults to ~/.claude or CLAUDE_CONFIG_DIR)
- [ ] `vibeview subagents /path/to/project` filters to sessions for that project
- [ ] `vibeview subagents /path/to/session.jsonl` analyzes a single session file
- [ ] Output shows total subagent spawns
- [ ] Output shows breakdown by agent type/description
- [ ] Output shows average turn counts
- [ ] --json flag outputs structured JSON
- [ ] Tests cover subagent aggregation logic
