---
id: "01kz462aq"
title: "Split show command rendering"
status: pending
priority: medium
type: chore
dependencies: []
tags: ["refactor"]
created_at: 2026-08-03
---

# Split show command rendering

## Objective

Split `apps/cli/cmd/vibeview/show.go` (367 lines) so no resulting file exceeds 200 lines. The file mixes the command wiring and message loading with conversation rendering and tool-call formatting. Separate those three concerns.

## Tasks

- [ ] Keep in `show.go` — command wiring and message loading: `showOptions`, `showCmd`, `resolveSessionMessages`, `parseSessionFromPath`, `filterConversationMessages`
- [ ] Create `show_render.go` — conversation rendering: `renderShow`, `renderUserMessage`, `renderAssistantMessage`
- [ ] Create `show_tools.go` — tool-call formatting and pager plumbing: `formatToolSummary`, `extractToolKeyArg`, `truncateArg`, `renderVerboseToolCall`, `withPager`, `isTTY`
- [ ] Run `make check` to confirm everything compiles and tests pass

## Acceptance Criteria

- No non-test `.go` file resulting from this split exceeds 200 lines
- Command wiring, rendering, and tool formatting are in separate files
- `make check` passes
