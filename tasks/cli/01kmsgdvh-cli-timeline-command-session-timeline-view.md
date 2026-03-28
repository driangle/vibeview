---
title: "CLI timeline command — session timeline view"
id: "01kmsgdvh"
status: pending
priority: low
type: feature
tags: ["cli", "aggregate"]
created: "2026-03-28"
---

# CLI timeline command — session timeline view

## Objective

Add a `vibeview timeline [folder]` command that shows a chronological list of sessions with one-line summaries. Useful for answering "what did I do last Thursday?" Also accepts an individual `.jsonl` session file for single-session analysis. When no folder is provided, default to `CLAUDE_CONFIG_DIR` env var or `~/.claude`.

## Tasks

- [ ] Add `timeline` cobra command with optional folder positional arg
- [ ] Implement folder defaulting logic: positional arg → CLAUDE_CONFIG_DIR env → ~/.claude
- [ ] Support individual .jsonl session file as input (analyze a single session)
- [ ] List sessions chronologically with one-line summaries (title, cost, duration, key files)
- [ ] Support --since and --until date filters
- [ ] Support --limit flag (default 20)
- [ ] Group by day with date headers
- [ ] Add --json and --yaml output format flags
- [ ] Add --dirs flag for project directory filtering
- [ ] Write tests for timeline generation

## Acceptance Criteria

- [ ] `vibeview timeline` works with no arguments (defaults to ~/.claude or CLAUDE_CONFIG_DIR)
- [ ] `vibeview timeline /path/to/project` filters to sessions for that project
- [ ] `vibeview timeline /path/to/session.jsonl` analyzes a single session file
- [ ] Output shows chronological session list with summaries
- [ ] --since and --until flags filter by date
- [ ] --limit flag controls number of results
- [ ] Sessions grouped by day with date headers
- [ ] --json flag outputs structured JSON
- [ ] Tests cover timeline generation
