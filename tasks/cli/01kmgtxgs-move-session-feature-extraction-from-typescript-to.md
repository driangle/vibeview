---
title: "Move session feature extraction from TypeScript to Go API"
id: "01kmgtxgs"
status: pending
priority: high
type: feature
tags: ["refactor", "api", "backend"]
created: "2026-03-24"
---

# Move session feature extraction from TypeScript to Go API

## Objective

Move session feature extraction and parsing logic from the frontend (`apps/web/src/lib/extractors/`) to the Go API layer. The API should return pre-extracted, summarized session data (tool counts, bash commands, errors, worktrees, subagents, skills, files touched) alongside the raw messages, so the frontend consumes structured data instead of re-parsing message content blocks on every render.

## Tasks

- [ ] Define Go structs for each extraction result (tool counts, bash commands, errors, worktrees, subagents, skills, files touched)
- [ ] Add a `SessionInsights` (or similar) field to the session detail API response
- [ ] Implement tool count extraction in Go (count tool_use blocks by name)
- [ ] Implement bash command extraction in Go (Bash tool_use blocks with command input)
- [ ] Implement error extraction in Go (tool_result blocks with is_error flag)
- [ ] Implement worktree extraction in Go (EnterWorktree tool_use blocks, parse result text)
- [ ] Implement subagent extraction in Go (Agent tool_use blocks and agent_progress messages)
- [ ] Implement skill extraction in Go (Skill tool_use blocks and `<command-name>` user messages)
- [ ] Classify message types in Go: detect skill expansion messages (`isMeta` + "Base directory for this skill:" content) and expose a `messageKind` field (e.g. `skill-expansion`) so the frontend doesn't need content-based detection logic
- [ ] Implement files touched extraction in Go (Read/Write/Edit tool_use blocks)
- [ ] Update the frontend to consume pre-extracted data from the API instead of running extractors
- [ ] Remove the TypeScript extractors that are now handled server-side
- [ ] Remove frontend content-based detection of skill expansion messages (`extractSkillExpansionName` in MessageBubble.tsx) — replace with API-provided `messageKind`

## Acceptance Criteria

- The `GET /api/sessions/{id}` response includes a structured insights/summary object with all extracted data
- The frontend sidebar components render from the API-provided data, not from client-side message parsing
- All existing sidebar sections (Tool Usage, Skills, Bash Commands, Worktrees, Subagents, Errors, Files Touched) continue to display the same information
- Navigation (locate/jump to message) still works using message UUIDs provided by the API
- No regression in sidebar behavior or data accuracy
