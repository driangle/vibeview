---
title: "Introduce feature extractor pattern for session data"
id: "01kmfse19"
status: completed
priority: high
type: improvement
effort: large
tags: ["architecture", "extractors", "schema-resilience"]
created: "2026-03-24"
---

# Introduce feature extractor pattern for session data

## Objective

Replace scattered, ad-hoc field access on raw JSONL messages with a centralized **feature extractor** layer. Each extractor owns one concept (subagents, files, tools, worktrees, etc.), supports multiple JSONL format versions via strategy functions, and exposes a stable typed interface to UI components.

This makes the codebase resilient to Claude Code JSONL format changes — when a new format appears, add a strategy file to the relevant extractor folder instead of patching N components.

## Background

Claude Code's JSONL format is unversioned and evolves without notice. For example, subagent data used to arrive as `agent_progress` progress messages but now arrives only as `Agent` tool_use blocks (with `run_in_background`). The current code only handles the old format, so the sidebar shows no subagents for newer sessions.

The same fragility exists for worktrees (regex-parsed from freeform text), file operations (hardcoded tool name checks), and bash commands.

## Architecture

```
extractors/
  types.ts                — shared ExtractorStrategy<T> type
  subagents/
    index.ts              — runs all strategies, merges, dedupes by agentId
    types.ts              — SubagentInfo (stable contract)
    fromAgentProgress.ts  — old format: progress messages with data.type === 'agent_progress'
    fromToolUse.ts        — new format: Agent tool_use blocks + tool_result
  files/
    index.ts
    types.ts
    fromReadWriteEdit.ts
  worktrees/
    index.ts
    types.ts
    fromEnterWorktree.ts
  tools/
    index.ts
    types.ts
    fromContentBlocks.ts
  commands/
    index.ts
    types.ts
    fromBashToolUse.ts
  errors/
    index.ts
    types.ts
    fromToolResults.ts
```

Each strategy function has the same signature:

```ts
type ExtractorStrategy<T> = (
  messages: MessageResponse[],
  toolResults: Map<string, ContentBlock>
) => T[];
```

Each feature's `index.ts` runs all strategies via `flatMap` and deduplicates by the feature's identity key.

## Tasks

- [x] Create `apps/web/src/lib/extractors/contentBlocks.ts` with shared helpers
- [x] **Subagents extractor** — `extractors/subagents/`
  - [x] Define `SubagentInfo` type (agentId, prompt, description, turns, messageUuid)
  - [x] Implement `fromAgentProgress.ts` (old format: `agent_progress` messages)
  - [x] Implement `fromToolUse.ts` (new format: `Agent` tool_use blocks)
  - [x] Wire `index.ts` with strategies array, dedup by agentId
  - [x] Migrate `useSessionData.ts` agentGroups logic to use extractor
  - [x] Migrate `SessionInsights.tsx` SubagentsSummary to use extractor
  - [x] Migrate `buildTimeline.ts` subagent detection to use extractor
- [x] **Files extractor** — `extractors/files/`
  - [x] Define `FileContentEntry`, `FilesByCategory` types
  - [x] Implement `fromToolUseBlocks.ts` and `resolveOperations.ts`
  - [x] Migrate `FilesTouched.tsx` to use extractor
- [x] **Worktrees extractor** — `extractors/worktrees/`
  - [x] Define `WorktreeEntry` type
  - [x] Implement `fromEnterWorktree.ts` (replace regex parsing in SessionInsights)
  - [x] Migrate `SessionInsights.tsx` worktree extraction to use extractor
- [x] **Tools extractor** — `extractors/tools/`
  - [x] Define `ToolCount` type
  - [x] Implement `fromToolUseBlocks.ts`
  - [x] Migrate `SessionInsights.tsx` tool usage summary to use extractor
- [x] **Commands extractor** — `extractors/commands/`
  - [x] Define `BashCommandEntry` type
  - [x] Implement `fromToolUseBlocks.ts`
  - [x] Migrate `SessionInsights.tsx` commands section to use extractor
- [x] **Errors extractor** — `extractors/errors/`
  - [x] Define `ErrorEntry` type
  - [x] Implement `fromToolResults.ts`
  - [x] Migrate `SessionInsights.tsx` errors section to use extractor
- [ ] Add unit tests for each extractor with sample JSONL fixtures (old + new formats)
- [x] Remove all direct `msg.data?.type === 'agent_progress'` and similar raw field access from components

## Acceptance Criteria

- No UI component directly accesses raw message fields for feature data (subagents, files, worktrees, tools, commands, errors)
- Subagents sidebar works for both old (`agent_progress`) and new (`Agent` tool_use) JSONL formats
- Each extractor folder contains a `types.ts` with the stable interface and one or more strategy files
- Adding a new format variant requires only adding a strategy file and registering it in the folder's `index.ts`
- Existing functionality is preserved — no visual regressions
- Unit tests cover both old and new format variants for subagents
