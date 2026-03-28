---
title: "CLI models command — model usage comparison"
id: "01kmsgdj2"
status: pending
priority: medium
type: feature
tags: ["cli", "aggregate"]
created: "2026-03-28"
---

# CLI models command — model usage comparison

## Objective

Add a `vibeview models [folder]` command that compares model usage across sessions. Helps users understand which models they rely on, relative cost efficiency, and token consumption per model. Also accepts an individual `.jsonl` session file for single-session analysis. When no folder is provided, default to `CLAUDE_CONFIG_DIR` env var or `~/.claude`.

## Tasks

- [ ] Add `models` cobra command with optional folder positional arg
- [ ] Implement folder defaulting logic: positional arg → CLAUDE_CONFIG_DIR env → ~/.claude
- [ ] Support individual .jsonl session file as input (analyze a single session)
- [ ] Aggregate session count per model
- [ ] Aggregate token usage per model (input, output, cache)
- [ ] Compute cost per model
- [ ] Compute average cost-per-message by model
- [ ] Compute error rate per model (proxy for output quality)
- [ ] Format as comparison table in terminal output
- [ ] Add --json and --yaml output format flags
- [ ] Add --dirs flag for project directory filtering
- [ ] Write tests for model aggregation logic

## Acceptance Criteria

- [ ] `vibeview models` works with no arguments (defaults to ~/.claude or CLAUDE_CONFIG_DIR)
- [ ] `vibeview models /path/to/project` filters to sessions for that project
- [ ] `vibeview models /path/to/session.jsonl` analyzes a single session file
- [ ] Output shows session count per model
- [ ] Output shows token and cost breakdown per model
- [ ] Output shows cost-per-message comparison
- [ ] --json flag outputs structured JSON
- [ ] Tests cover model aggregation logic
