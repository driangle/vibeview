---
id: "01kn221ch"
title: "CLI session conversation export as human-readable text"
status: pending
priority: medium
effort: medium
type: feature
dependencies: []
tags: [cli, commands]
created: 2026-03-31
---

# CLI session conversation export as human-readable text

## Objective

Implement a `vibeview show <session-id>` command that renders a session's full conversation as compact, human-readable text in the terminal. The default output should be clean and scannable — no raw JSON, no token/usage metadata, just the conversation flow. This is the CLI equivalent of reading through a session without launching the web UI.

## Tasks

- [ ] Add `show` subcommand accepting a session ID (full or prefix match)
- [ ] Render user and assistant text messages with role labels and visual separation (dividers or blank lines)
- [ ] Display tool calls as compact one-line summaries: `[Tool] Read src/main.ts ✓` or `[Tool] Bash "npm test" ✗`
- [ ] Omit raw JSON, token counts, usage metadata, and other noise from default output
- [ ] Show subagent invocations as a single summary line with prompt snippet and turn count
- [ ] Skip thinking blocks by default (add `--thinking` flag to include them)
- [ ] Add `--verbose` flag to expand tool calls with full input/output detail
- [ ] Add `--json` flag to output the raw message array as JSON
- [ ] Add `--no-color` flag to strip ANSI codes for piping/redirection
- [ ] Support paging via `$PAGER` (e.g., `less -R`) when output exceeds terminal height
- [ ] Write tests for message rendering and flag behavior

## Acceptance Criteria

- `vibeview show <id>` prints the conversation in a clean, compact format — no JSON blobs or metadata
- Tool calls render as one-line summaries (tool name, key input, pass/fail indicator)
- User and assistant messages are visually distinguished (labels, indentation, or color)
- `--verbose` expands tool calls to show full input and output
- `--json` outputs valid JSON matching the API's message format
- Output is pipe-friendly with `--no-color`
- Session ID prefix matching works (e.g., `vibeview show abc` matches `abcdef12-...`)
- Tests cover rendering of each message type and all flag combinations
