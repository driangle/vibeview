---
title: "Implement cost calculation"
id: "01kkqx7ky"
status: completed
priority: medium
effort: small
type: feature
tags: ["backend", "cost"]
phase: "core"
dependencies: ["01kkqx2e3"]
created: "2026-03-15"
---

# Implement cost calculation

## Objective

Parse the `costUSD` field that Claude Code already includes in its JSONL usage data, and aggregate costs per session. No need for hardcoded pricing tables — use the source-of-truth cost directly from Claude Code's output.

## Tasks

- [x] Add `CostUSD` field to the `Usage` struct in `claude.go`
- [x] Aggregate `costUSD` and token counts across all assistant messages per session
- [x] Expose cost data in session API responses
- [x] Write unit tests for cost aggregation

## Acceptance Criteria

- `costUSD` parsed from Claude Code JSONL usage data
- Session total aggregates all assistant message usage and cost data
- API responses include both raw token counts and dollar cost totals
