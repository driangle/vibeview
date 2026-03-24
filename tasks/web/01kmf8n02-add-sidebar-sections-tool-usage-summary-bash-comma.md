---
title: "Add sidebar sections: Tool Usage Summary, Bash Commands, Errors, and Session Duration"
id: "01kmf8n02"
status: completed
priority: medium
type: feature
tags: ["ui", "sidebar"]
created: "2026-03-24"
---

# Add sidebar sections: Tool Usage Summary, Bash Commands, Errors, and Session Duration

## Objective

Enrich the SessionView sidebar and header with additional contextual information derived from session messages: a tool usage summary, a list of bash commands run, an error summary, and session duration in the main header section.

## Tasks

- [x] Add **Session Duration** to the session header (top/main section, not sidebar) — compute from first to last message timestamp, display as human-readable duration (e.g. "12m 34s")
- [x] Add **Tool Usage Summary** sidebar section — count how many times each tool was called (e.g. "Edit ×12, Read ×8, Bash ×5"), extracted from `tool_use` blocks in `displayMessages`
- [x] Add **Bash Commands Run** sidebar section — list shell commands executed during the session, extracted from Bash `tool_use` blocks (`input.command`), shown as a scrollable list of truncated commands
- [x] Add **Errors** sidebar section — collect failed tool calls (`is_error: true` on `tool_result` blocks), show count and list with tool name and error snippet; hide section if no errors

## Acceptance Criteria

- Session header shows duration (e.g. "12m 34s") computed from first to last message
- Sidebar shows a "Tool Usage" section with per-tool call counts
- Sidebar shows a "Commands" section listing bash commands run during the session
- Sidebar shows an "Errors" section with count and details of failed tool calls; section is hidden when there are no errors
- All new sections gracefully handle empty data (hidden or show appropriate empty state)
