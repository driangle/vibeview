---
title: "CLI compare command — period-over-period comparison"
id: "01kmsge4p"
status: pending
priority: low
type: feature
tags: ["cli", "aggregate"]
created: "2026-03-28"
---

# CLI compare command — period-over-period comparison

## Objective

Add a `vibeview compare [folder]` command that compares usage metrics across time periods. Shows this week vs last week (or custom periods) with trend indicators. Also accepts an individual `.jsonl` session file for single-session analysis. When no folder is provided, default to `CLAUDE_CONFIG_DIR` env var or `~/.claude`.

## Tasks

- [ ] Add `compare` cobra command with optional folder positional arg
- [ ] Implement folder defaulting logic: positional arg → CLAUDE_CONFIG_DIR env → ~/.claude
- [ ] Support individual .jsonl session file as input (analyze a single session)
- [ ] Support --period flag: day, week, month (default: week)
- [ ] Compute current vs previous period for: sessions, cost, tokens, files touched, tools used
- [ ] Show trend arrows/indicators (up/down/flat) for each metric
- [ ] Show percentage change for each metric
- [ ] Format as side-by-side comparison table in terminal output
- [ ] Add --json and --yaml output format flags
- [ ] Add --dirs flag for project directory filtering
- [ ] Write tests for period comparison logic

## Acceptance Criteria

- [ ] `vibeview compare` works with no arguments (defaults to ~/.claude or CLAUDE_CONFIG_DIR)
- [ ] `vibeview compare /path/to/project` filters to sessions for that project
- [ ] `vibeview compare /path/to/session.jsonl` analyzes a single session file
- [ ] Output shows current vs previous period comparison
- [ ] --period flag switches between day/week/month granularity
- [ ] Output shows trend indicators and percentage changes
- [ ] --json flag outputs structured JSON
- [ ] Tests cover period comparison logic
