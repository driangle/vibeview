---
title: "Attribute tokens to tools, MCP, skills, subagents, and files"
id: "01kz3q6a4"
status: pending
priority: high
type: feature
phase: "usage-improvements"
dependencies: ["01kz3q60q"]
tags: ["usage", "analytics", "backend"]
created: "2026-08-03"
parent: 01kz3q22m
---

# Attribute tokens to tools, MCP, skills, subagents, and files

## Objective

Join per-message usage with the already-extracted per-session activity (tools,
MCP calls, skills, subagents, files) so users can see which of these drove the
most token consumption. This turns "which session is expensive" into "which
*tool / MCP / skill / file* is expensive", which is what catches repeat offenders
(e.g. a verbose MCP result, or the same file re-read 20×).

## Feasibility (important — document in output)

- Usage is reported per **turn**, not per tool call. Attribution is therefore an
  **approximation**: attribute a turn's output tokens to that turn's `tool_use`
  blocks, and attribute a tool result's size to the *next* turn's input/cache
  growth. Good enough to rank offenders; must be clearly labeled as an estimate.
- **Subagents are exact**, not approximate — they have their own session JSONL
  files with their own usage; attribute from those directly.

## Context (file:line)

- `apps/lib/insights/types.go` — existing extraction (`ToolCount`, `SkillEntry`,
  `SubagentEntry`, `FileEntry`) — counts/names, **no usage fields** today.
- `apps/lib/insights/skills.go`, `tools.go`, `subagents.go`, `files.go` — extractors.
- `apps/lib/claude/claude.go:239-243` — `tool_use` blocks carry `Name` (MCP tools
  use the `mcp__*` prefix — use it to distinguish MCP from built-in tools).

## Tasks

- [ ] Add a joiner (in `insights` or the new `usage` package) that associates each
      `tool_use` / skill invocation / file access with its turn's usage using the
      approximation above.
- [ ] Distinguish MCP tools (`mcp__*`) from built-in tools in the rollup.
- [ ] Attribute subagent cost from each subagent's own session JSONL (exact).
- [ ] Add `--by tool|mcp|skill|subagent|file` to `vibeview usage` (extends the CLI
      task).
- [ ] Label approximate dimensions as estimates in all output.
- [ ] Tests: a fixture exercising the approximation that asserts ranking stability,
      plus an exact-attribution test for subagents.

## Acceptance Criteria

- `vibeview usage --by tool|mcp|skill|file` produces a ranked breakdown; approximate
  numbers are clearly marked as estimates.
- Subagent attribution is exact (sourced from subagent session files).
- MCP tools are distinguished from built-in tools.
- New behavior covered by tests; `make check` passes.
