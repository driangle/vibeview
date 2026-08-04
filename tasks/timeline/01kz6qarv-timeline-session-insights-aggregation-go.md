---
id: "01kz6qarv"
title: "Timeline: session insights aggregation (Go)"
status: completed
priority: high
effort: medium
phase: timeline
dependencies: ["01kz6qarr"]
tags: ["backend", "timeline", "go"]
created_at: 2026-08-04
completed_at: 2026-08-04
---

# Timeline: session insights aggregation (Go)

## Objective

Aggregate the exchanges from [[01kz6qarr]] into the session-level **timeline insights** that
power the overview strip and the insights popover: time-split, per-model breakdown, model
bands, token sparkline buckets, busiest files, top commands, skills, tool mix, and headline
stats (error count, longest exchange, top-5 token share). Computed in Go; rendered as-is by
the client.

## Design reference

`~/Downloads/Timeline view design directions-handoff.zip` → `.../Timeline Track.dc.html`.
The `renderVals()` script is the authoritative spec for each aggregate:
- **Where the time went** → `ins.split` (Model generation / Tool calls / Subagents /
  Waiting-on-you) with a "Waiting on you" hatched segment.
- **Models used** → `modelRows` (tokens/duration/cost + switch count) and the overview
  **model bands** (`bandRuns`, contiguous runs of the same model).
- **overview** sparkline buckets, error-colored (0 / 1 / 2+ errors per bucket).
- **Busiest files**, **Most-run commands**, **Skills loaded**, **Tool mix**.
- Headline tiles: errors count, longest run, tokens in top 5.

## Context

- Reuse existing whole-session extractors where they suffice (`ExtractToolCounts` = tool
  mix; `ExtractSkills` = skills). Files/commands need **tallying** (server insights give
  ordered lists, not counts): count `FilesResult.Entries` by path and `[]BashCommand` by
  command.
- Time-split attribution is derived (no ground truth). Mirror the mock's model:
  subagent share of duration, tool time bounded by tool count, remainder = generation,
  idle = summed gaps. Keep the heuristic in one documented function.

## Tasks

- [x] Add a `TimelineInsights` struct (+ nested types) to `apps/lib/timeline` and an
      aggregator, e.g. `BuildInsights(exchanges []Exchange, messages []claude.Message) TimelineInsights`.
- [x] Implement: `timeSplit`, `models` (per-model tokens/duration/cost/exchanges/switches),
      `modelBands`, `overviewBuckets` (tokens + errorLevel), `busiestFiles`, `topCommands`,
      `skills`, `toolMix`, `errorCount`, `longestExchangeIndex`, `top5TokenSharePct`,
      plus session totals (`totalTokens`, `totalCostUSD`, `totalDurationMs`).
- [x] Document the time-split heuristic and bucket count as constants.
- [x] Table-driven tests: single-model vs. multi-model sessions (band/switch counts),
      empty session (no divide-by-zero), file/command tallies, top-5 share math.

## Acceptance Criteria

- Aggregates are internally consistent (percentages sum ~100%, band widths cover the span).
- No panics or divide-by-zero on empty / single-exchange sessions.
- `go test ./...` passes; `make check-lite` stays green.
