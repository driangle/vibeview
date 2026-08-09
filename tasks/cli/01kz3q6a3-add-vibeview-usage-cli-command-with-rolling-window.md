---
title: "Add vibeview usage CLI command with rolling-window views"
id: "01kz3q6a3"
status: pending
priority: high
type: feature
phase: "usage-improvements"
dependencies: ["01kz3q60q", "01kz3q6a5"]
tags: ["usage", "analytics", "cli"]
created: "2026-08-03"
parent: 01kz3q22m
---

# Add vibeview usage CLI command with rolling-window views

## Objective

Add a `vibeview usage` command that answers "what is consuming my token budget"
— the primary use case being the rolling 5-hour limit. It mirrors the conventions
of the existing `stats` command but exposes the by-window / by-model /
by-project / by-session breakdowns unlocked by the lib foundation task.

## Context (file:line)

- `apps/cli/cmd/vibeview/stats.go:47` — `statsCmd` (pattern to mirror: flags,
  input resolution, styled + `--json`/`--yaml` output).
- `apps/cli/cmd/vibeview/main.go:92-99` — command registration.
- `apps/cli/cmd/vibeview/stats_test.go` — test pattern to follow.

## Tasks

- [ ] Add a `usage` cobra command registered in `main.go`, reusing `stats`'
      input resolution (no args → `~/.claude`, folder, `.jsonl`, or session id) and
      the `--dirs` filter.
- [ ] Flags: `--by session|model|project|day|hour|window`, `--window 5h`
      (rolling), `--top N`, `--since` / `--until`, `--json` / `--yaml`.
- [ ] Default (no `--by`) answers "which rolling windows consumed the most, and the
      top sessions/projects driving each" — the 5-hour-limit view.
- [ ] Styled table output reusing existing table/section helpers; `--json`/`--yaml`
      emit the raw report struct.
- [ ] Tests for arg/flag parsing and report shape, following `stats_test.go`.
- [ ] Document the command in `apps/docs` (guide + command reference).

## Acceptance Criteria

- `vibeview usage --window 5h` shows, per rolling 5-hour window, total tokens and
  the top-N sessions/projects.
- `vibeview usage --by model` attributes tokens per model correctly (mixed-model
  sessions split, not collapsed).
- `--json` / `--yaml` output matches the styled report.
- New behavior covered by tests; `make check` passes; docs updated.
