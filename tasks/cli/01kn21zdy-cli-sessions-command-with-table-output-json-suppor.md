---
id: "01kn21zdy"
title: "CLI sessions command with table output, JSON support, and pagination"
status: completed
priority: medium
effort: medium
type: feature
dependencies: []
tags: [cli, commands]
created: 2026-03-31
completed_at: 2026-04-18
---

# CLI sessions command with table output, JSON support, and pagination

## Objective

Implement a `vibeview sessions` command that outputs a table of sessions, similar to the session list shown on the web UI. The command should support `--json` for machine-readable output and pagination for navigating large session lists.

## Tasks

- [x] Add `sessions` subcommand to the CLI entrypoint
- [x] Reuse existing session discovery/indexing logic to list sessions
- [x] Render a formatted table with columns: ID, title/slug, directory, model, timestamp, message count, cost
- [x] Add `--json` flag to output sessions as JSON (one object per session or JSON array)
- [x] Add `--limit` / `--offset` (or `--page` / `--per-page`) flags for pagination
- [x] Add `--dir` flag to filter by project directory (consistent with web UI)
- [x] Add `--sort` flag for column-based sorting (e.g., `--sort timestamp`, `--sort cost`)
- [x] Write tests for the new command

## Acceptance Criteria

- `vibeview sessions` prints a human-readable table of sessions to stdout
- `vibeview sessions --json` outputs valid JSON with the same data
- Pagination flags work correctly and default to a sensible page size
- `--dir` filter matches the behavior of the web session list filter
- Table output is well-aligned and readable in standard terminal widths
- Tests cover table rendering, JSON output, pagination, and filtering
