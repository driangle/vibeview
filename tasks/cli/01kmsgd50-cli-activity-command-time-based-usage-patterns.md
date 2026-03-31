---
title: "CLI activity command — time-based usage patterns"
id: "01kmsgd50"
status: pending
priority: medium
type: feature
tags: ["cli", "aggregate"]
created: "2026-03-28"
---

# CLI activity command — time-based usage patterns

## Objective

Add a `vibeview activity [folder]` command that shows time-based usage patterns across sessions. Helps users understand when they use Claude Code most and identify usage trends. Also accepts an individual `.jsonl` session file for single-session analysis. When no folder is provided, default to `CLAUDE_CONFIG_DIR` env var or `~/.claude`.

## Tasks

- [ ] Add `activity` cobra command with optional folder positional arg
- [ ] Implement folder defaulting logic: positional arg → CLAUDE_CONFIG_DIR env → ~/.claude
- [ ] Support individual .jsonl session file as input (analyze a single session)
- [ ] Compute sessions per day/week with ASCII sparkline or bar chart
- [ ] Compute peak usage hours (hour-of-day distribution)
- [ ] Compute streaks (longest active stretch) and gaps (longest break)
- [ ] Add summary line (e.g. "12 sessions this week, up from 4 last week")
- [ ] Support --since and --until date filters
- [ ] Add --json and --yaml output format flags
- [ ] Add --dirs flag for project directory filtering
- [ ] Write tests for time aggregation logic

## Acceptance Criteria

- [ ] `vibeview activity` works with no arguments (defaults to ~/.claude or CLAUDE_CONFIG_DIR)
- [ ] `vibeview activity /path/to/project` filters to sessions for that project
- [ ] `vibeview activity /path/to/session.jsonl` analyzes a single session file
- [ ] Output shows sessions per day/week visualization
- [ ] Output shows peak usage hours
- [ ] Output shows streak and gap information
- [ ] --since and --until flags filter the date range
- [ ] --json flag outputs structured JSON
- [ ] Tests cover time aggregation logic
