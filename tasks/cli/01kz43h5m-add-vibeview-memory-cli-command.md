---
id: "01kz43h5m"
title: "Add vibeview memory CLI command"
status: pending
priority: medium
effort: small
type: feature
phase: memory-explorer
dependencies: ["01kz43h5k"]
tags: [cli, memory-explorer]
context: ["apps/cli/cmd/vibeview/main.go", "apps/cli/cmd/vibeview/stats.go", "apps/lib/memory"]
created_at: 2026-08-03
verify:
  - type: bash
    run: "cd apps/cli && go build ./... && go test ./..."
---

# Add vibeview memory CLI command

## Objective

Add a `vibeview memory` subcommand for browsing and searching Claude's auto-memory
and `CLAUDE.md` instruction files from the terminal, backed by `apps/lib/memory`.

## Context / Findings

- Each subcommand is a factory function returning a `*cobra.Command`, kept in its own
  file under `apps/cli/cmd/vibeview/` (see `stats.go`, `sessions.go`), registered in
  `main()` via `root.AddCommand(memoryCmd(&claudeDir, &logLevel))`.
- The shared `--claude-dir` / `--log-level` persistent flags are threaded through the
  factory; resolve `claudeDir` and hand it to `memory.Discover`.
- Existing analytics commands (`stats`, `activity`) establish the table + `--format json`
  output convention — follow it.

## Tasks

- [ ] Create `apps/cli/cmd/vibeview/memory.go` with a `memoryCmd(...)` factory and
      register it in `main()`.
- [ ] Default (`vibeview memory`): list projects that have memory, with entry counts
      and per-type breakdown, as a table.
- [ ] `vibeview memory <project>`: list that project's entries (name, type,
      description); support a `--show <name>` to print a single entry's full body.
- [ ] `--search <query>` / `--type <type>` flags to filter entries across (or within)
      projects.
- [ ] `--format json` for machine-readable output, matching the other commands.
- [ ] Include the global `CLAUDE.md` in output, clearly labeled as an instruction
      file distinct from auto-memory entries.
- [ ] Test the command wiring and output shaping (table + json) against a temp
      `claudeDir` fixture.

## Acceptance Criteria

- `cd apps/cli && go build ./... && go test ./...` passes.
- `vibeview memory` lists projects with memory; `vibeview memory <project>` lists
  entries; `--show` prints a full entry.
- `--search` / `--type` filter correctly; `--format json` emits valid JSON.
- Global `CLAUDE.md` is surfaced and labeled distinctly from auto-memory.
- `vibeview memory --help` documents the subcommand and flags.
