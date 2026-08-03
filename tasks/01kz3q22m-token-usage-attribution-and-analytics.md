---
id: "01kz3q22m"
title: "Token usage attribution and analytics"
status: blocked
priority: high
type: feature
effort: large
dependencies: []
tags: ["usage", "analytics", "cli", "web"]
created_at: 2026-08-03
---

# Token usage attribution and analytics

## Objective

Give users visibility into **what is consuming their token budget** — so they can
understand and avoid hitting the rolling 5-hour usage limit. Today vibeview only
exposes per-session totals and a weak by-model breakdown; there is no way to see
usage by time-window, project, tool, MCP, skill, subagent, or file, and no
per-turn drill-down to find the expensive moments in a session.

The enabling insight: the parser (`apps/lib/claude`) already reads per-message
`usage` (input / output / cache-creation / cache-read) **and** per-message
`model`, and the `insights` package already extracts tools / skills / subagents /
files / bash-commands per session. These two streams are simply never joined —
usage is collapsed into per-session totals before anything downstream sees it.
Everything needed for rich attribution already exists at the parse layer.

## Decomposition (phase: usage-improvements)

This is the umbrella/spec. The phased plan below is now tracked as five child tasks
(execute in dependency order):

1. `01kz3q60q` — Retain per-message usage and add dimension aggregation in lib *(foundation, blocks the rest)*
2. `01kz3q6a3` — Add `vibeview usage` CLI command with rolling-window views
3. `01kz3q6a4` — Attribute tokens to tools, MCP, skills, subagents, and files
4. `01kz3q7hb` — Per-turn usage drill-down API and web Usage analytics page
5. `01kz3q6a5` — Estimate cost from tokens using a model pricing table *(optional)*

Tasks 2–5 depend on task 1; 2, 3, and 5 can proceed in parallel once 1 lands, and
4 benefits from 3. This parent stays `blocked` until the children complete.

## Motivation / context

The Claude Code 5-hour limit is a **rolling token budget across all sessions**,
dominated by cached input context re-read every turn. The most valuable views are
therefore: (1) rolling-window consumption, (2) per-turn drill-down to spot the
turn that ballooned context (usually a large file read or verbose tool/MCP
result), and (3) attribution by tool / MCP / skill / file to catch repeated
offenders.

### Feasibility notes (read before implementing)

- **Cleanly attributable** (usage is reported per message): by session, by model,
  by project/dir, by time-window, by subagent (subagents have their own JSONL
  files with their own usage).
- **Approximate** (usage is per *turn*, not per tool call): by tool / MCP / file.
  Attribute a turn's output tokens to that turn's `tool_use` blocks, and attribute
  a tool result's size to the *next* turn's input/cache growth. Good enough to
  rank offenders; document it as an estimate, don't present it as exact.
- **Cost**: only trust `result.total_cost_usd` where present (mostly programmatic
  sessions). For interactive sessions, compute cost from tokens × model pricing —
  requires a model→pricing table (new config). Keep cost optional/clearly
  estimated when derived.

## Current-state reference (file:line)

- Raw parse: `apps/lib/claude/claude.go:250-257` (`Usage`), `:186-208`
  (`APIMessage` model+usage), `:122` (`Message.TotalCostUSD`).
- Per-session aggregation (collapses granularity): `apps/lib/session/session.go:18-27`
  (`UsageTotals`), `:462-477` and `:748-763` (enrichment loops; also sets
  `meta.Model` to first-seen model — loses multi-model attribution).
- CLI stats: `apps/cli/cmd/vibeview/stats.go:186-273` (`buildStatsReport`),
  model breakdown struct `:39-43` (sessions+cost only, no per-model tokens).
- Insights (counts, no usage fields): `apps/lib/insights/types.go`.
- Activity endpoint (session **counts** only, no tokens): `server.go:800`,
  `:855-896`; web page `apps/web/src/pages/UsagePatterns.tsx`.
- Web usage rendering: `TokenBreakdownPopover.tsx`, `SessionViewHeader.tsx:9-29`,
  `useSessionData.ts:70-84`, `lib/timeline/cycleMetrics.ts:44-97`.

## Phased plan

### Phase 1 — Rolling-window + dimension aggregation in the lib (foundation)

- [ ] In `apps/lib/session` (or a new `apps/lib/usage` package), stop discarding
      per-message usage. Retain a lightweight per-message record: timestamp,
      model, input/output/cache tokens, and the message/session/project it belongs
      to. Keep memory bounded (aggregate as you scan; don't hold all messages).
- [ ] Fix per-model attribution: sum tokens by the message's own `model`, not the
      session's first-seen model.
- [ ] Add aggregation functions: by time-bucket (hour/day/rolling-window), by
      model, by project/dir, by session.
- [ ] Unit tests for each aggregation (behavior, not implementation).

### Phase 2 — `vibeview usage` CLI command

- [ ] Add a `usage` command mirroring `stats`' conventions
      (`apps/cli/cmd/vibeview/`), with `--json` / `--yaml` and styled table output.
- [ ] Flags: `--by session|model|project|day|hour|window`, `--window 5h`
      (rolling), `--top N`, `--since` / `--until`, reuse `--dirs`.
- [ ] Default view answers "which sessions/projects consumed the most in each
      rolling window" — the primary 5-hour-limit use case.
- [ ] Tests for the command (arg parsing + report shape), following the pattern in
      `stats_test.go`.

### Phase 3 — Tool / MCP / skill / file attribution (approximate)

- [ ] Extend the `insights` extraction (or a new joiner) to associate each
      `tool_use` / skill invocation / file access with the turn's usage, using the
      approximation documented above. Distinguish MCP tools (`mcp__*` prefix) from
      built-in tools.
- [ ] Add `--by tool|mcp|skill|subagent|file` to `vibeview usage`.
- [ ] For subagents, attribute cost from their own session JSONL (clean, not
      approximate).
- [ ] Tests, including a fixture that exercises the approximation and asserts
      ranking is stable.
- [ ] Clearly label approximate numbers as estimates in output.

### Phase 4 — Per-turn drill-down + web "Usage" analytics page

- [ ] Persist/serve per-message usage so a session can be inspected turn-by-turn
      to find the turn that ballooned context (new API field/endpoint in
      `internal/server`).
- [ ] Add a web "Usage" analytics page (or extend `UsagePatterns` with a
      tokens/cost mode): rolling-window chart, top sessions/projects/tools, and a
      per-session turn breakdown. Reuse existing chart components
      (`ContributionGraph`, `HourOfDayChart`) where possible.
- [ ] Backend owns the aggregation (per CLAUDE.md: frontend is a thin display
      layer). Tests for new endpoints + a component test for the page.

### Phase 5 — Cost accuracy (optional, can be split out)

- [ ] Add a model→pricing config (Opus/Sonnet/Haiku input/output/cache rates).
- [ ] Compute estimated cost from tokens where `total_cost_usd` is absent; label
      derived cost as estimated.
- [ ] Wire estimated cost into `usage` and `stats`.

## Acceptance Criteria

- `vibeview usage --window 5h` shows, for each rolling 5-hour window, the total
  tokens consumed and the top-N sessions/projects driving it.
- `vibeview usage --by model` correctly attributes tokens per model (mixed-model
  sessions are split, not collapsed to first-seen model).
- `vibeview usage --by tool|mcp|skill|file` produces a ranked breakdown; approximate
  dimensions are clearly labeled as estimates.
- A session can be inspected turn-by-turn to identify the highest-token turns.
- The web UI surfaces token/cost (not just session counts) over time.
- All new behavior is covered by tests; `make check` passes.

## Out of scope / follow-ups

- Live enforcement or prediction of the 5-hour limit (this task is visibility only).
- Any change to how sessions are discovered or stored.
- Consider splitting Phase 4 (web) and Phase 5 (cost) into separate task files if
  Phases 1–3 land first.
