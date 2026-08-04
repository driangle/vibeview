---
id: "01kz6qarr"
title: "Timeline: exchange grouping and per-exchange metrics (Go)"
status: completed
priority: high
effort: medium
phase: timeline
dependencies: ["01kz6qa2p"]
tags: ["backend", "timeline", "go"]
created_at: 2026-08-04
completed_at: 2026-08-04
---

# Timeline: exchange grouping and per-exchange metrics (Go)

## Objective

Compute, in Go, the list of **exchanges** for a session — one per genuine user prompt plus
the assistant work that follows it — with all per-row metrics the Timeline Track needs.
This is the core domain logic that CLAUDE.md/cf-011 require to live server-side; the client
will only render it. Port the grouping semantics from the existing client
`buildTimeline`/`cycleMetrics` so behavior is preserved.

## Design reference

Row columns and per-exchange fields come from the Track design:
`~/Downloads/Timeline view design directions-handoff.zip` →
`.../Timeline Track.dc.html` (columns: Time, Elapsed, Prompt, Tools, Files, Tokens, Flags;
detail panel adds commands, skills, cost, badges). Mirror those field needs.

## Context

- Grouping rule to port (`apps/web/src/lib/timeline/buildTimeline.ts`): a new exchange
  starts on a `user` message whose content is **not** purely `tool_result`; `assistant`
  messages accumulate; `user` tool-result-only / `progress` / `system` / snapshots are
  auxiliary; leading assistant/aux with no prior prompt form an exchange with a null prompt.
- Reuse Go primitives: `claude.ParseSessionFile`, `insights.BuildToolResultMap`
  (`apps/lib/insights/helpers.go:17`), extractors (`ExtractToolCounts`,
  `ExtractBashCommands`, `ExtractSkills`, `ExtractErrors`, `ExtractFiles`), per-message
  `Usage`, and the pricing helper from [[01kz6qa2p]].
- No per-exchange grouping or duration exists in Go today (verified).

## Tasks

- [x] Add an `apps/lib/timeline` package with an `Exchange` struct and a builder,
      e.g. `BuildExchanges(messages []claude.Message) []Exchange`.
- [x] Per exchange, compute: `index`, `startTime`/`endTime`/`durationMs` (from message
      timestamps), `idleBeforeMs` (gap from previous exchange end), `promptPreview`
      (truncated first text of the prompt), `model`, `tokens` (sum assistant usage),
      `costUSD` (via pricing helper), distinct `tools`, `files`, `commands`, `skills`,
      `flags {hasErrors, deepThinking, hasSubagents, approvalGate}`, and `messageUuids`.
- [x] Match the existing badge/flag semantics (deepThinking, approvalGate = last block of
      last assistant message is `tool_use`, etc.) so it matches the current view.
- [x] Table-driven tests over representative message sequences: multi-tool loop exchange,
      tool-result-only messages folded as auxiliary, error flag, subagent flag, idle gap,
      leading-assistant (null prompt) exchange, empty session.

## Acceptance Criteria

- `BuildExchanges` reproduces the same cycle boundaries as the client `groupIntoCycles`
  for equivalent inputs (documented parity in tests).
- Durations are non-negative; `idleBeforeMs` is 0 for the first exchange.
- Costs are populated from the pricing helper (non-zero on known models).
- `go test ./...` passes; `make check-lite` stays green.
