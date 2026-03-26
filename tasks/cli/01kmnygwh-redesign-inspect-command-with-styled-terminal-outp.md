---
title: "Redesign inspect command with styled terminal output"
id: "01kmnygwh"
status: completed
priority: high
type: feature
tags: ["inspect", "ux"]
created: "2026-03-26"
---

# Redesign inspect command with styled terminal output

## Objective

Replace the default YAML dump output of `vibeview inspect` with a styled, human-readable terminal report. The current output is useful for debugging but not for quickly understanding what happened in a session. Keep `--json` and `--yaml` for machine consumption; the styled report becomes the new default.

## Tasks

- [x] Create a terminal renderer (e.g. `apps/cli/cmd/vibeview/render.go`) with section-based formatting using box-drawing characters and aligned columns
- [x] Render **header** section: session ID, project (shortened with `~`), slug, started time with relative "ago", duration, model, activity status
- [x] Render **conversation** section: turn counts by type, tokens formatted with commas (in/out/cache), cost
- [x] Render **tool usage** section: table with tool name, call count, and error count (cross-referenced from `insights.Errors`)
- [x] Render **files** section: read count + written file list (from `insights.Files.Categories.Written`)
- [x] Render **errors** section: list of errors encountered (if any)
- [x] Render **subagents** section: list with descriptions from `SubagentEntry.Description` (if any)
- [x] Render **skills** section: list with counts (if any)
- [x] Add `--verbose` / `-v` flag that appends diagnostic sections (resolution, parse, enrichment details)
- [x] Add explicit `--yaml` flag; make styled output the default (no flag)
- [x] Format tokens with commas, show relative time, shorten paths with `~`
- [x] Support all three inspect modes (file, directory, session ID lookup) in the new renderer
- [x] Add tests for the terminal renderer

## Acceptance Criteria

- Running `vibeview inspect <session-id>` without flags prints the styled terminal report
- `--json` continues to emit the full JSON data dump
- `--yaml` emits the full YAML data dump (previously the default)
- `--verbose` appends resolution/parse/enrichment diagnostic sections to the styled output
- All data in the styled output is mechanically derived from session data (no LLM)
- Token counts display with comma separators (e.g. `82,400`)
- Project paths use `~` shorthand for home directory
- Written files are listed by path, not just counted
- Tool errors are shown inline in the tool usage table
- Empty sections (no errors, no subagents, etc.) are omitted
