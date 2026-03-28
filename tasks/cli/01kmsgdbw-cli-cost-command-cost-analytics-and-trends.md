---
title: "CLI cost command — cost analytics and trends"
id: "01kmsgdbw"
status: pending
priority: high
type: feature
tags: ["cli", "aggregate"]
created: "2026-03-28"
---

# CLI cost command — cost analytics and trends

## Objective

Add a `vibeview cost [folder]` command that provides cost analytics and spending trends. Helps users track spend, identify expensive sessions, understand cache savings, and project future costs. Also accepts an individual `.jsonl` session file for single-session analysis. When no folder is provided, default to `CLAUDE_CONFIG_DIR` env var or `~/.claude`.

## Tasks

- [ ] Add `cost` cobra command with optional folder positional arg
- [ ] Implement folder defaulting logic: positional arg → CLAUDE_CONFIG_DIR env → ~/.claude
- [ ] Support individual .jsonl session file as input (analyze a single session)
- [ ] Compute cost per day/week/month trend
- [ ] Compute cost per session distribution (identify outlier sessions)
- [ ] Compute cost breakdown by model (Opus vs Sonnet vs Haiku)
- [ ] Compute cache hit ratio and estimated cache savings
- [ ] Compute projected monthly spend at current usage rate
- [ ] Format as summary + table in terminal output
- [ ] Support --since and --until date filters
- [ ] Add --json and --yaml output format flags
- [ ] Add --dirs flag for project directory filtering
- [ ] Write tests for cost aggregation logic

## Acceptance Criteria

- [ ] `vibeview cost` works with no arguments (defaults to ~/.claude or CLAUDE_CONFIG_DIR)
- [ ] `vibeview cost /path/to/project` filters to sessions for that project
- [ ] `vibeview cost /path/to/session.jsonl` analyzes a single session file
- [ ] Output shows cost per day/week/month
- [ ] Output shows cost distribution across sessions
- [ ] Output shows cost breakdown by model
- [ ] Output shows cache hit ratio and savings
- [ ] Output shows projected monthly spend
- [ ] --json flag outputs structured JSON
- [ ] Tests cover cost aggregation logic
