---
title: "Per-turn usage drill-down API and web Usage analytics page"
id: "01kz3q7hb"
status: pending
priority: high
type: feature
phase: "usage-improvements"
dependencies: ["01kz3q60q"]
tags: ["usage", "analytics", "web", "server"]
created: "2026-08-03"
parent: 01kz3q22m
---

# Per-turn usage drill-down API and web Usage analytics page

## Objective

Surface token/cost analytics in the web UI (today the `/activity` page shows only
session *counts*, no tokens), and let a user drill into a single session
turn-by-turn to find the exact turn that ballooned context. Backend owns the
aggregation; the frontend is a thin display layer (per CLAUDE.md).

## Context (file:line)

- `apps/cli/internal/server/server.go:800`, `:855-896` — `/activity` endpoint
  (session **counts** by day/hour; the same loop can bucket tokens/cost).
- `apps/web/src/pages/UsagePatterns.tsx` — existing activity page (extend or add a
  sibling "Usage" page).
- Reusable charts: `apps/web/src/components/ContributionGraph.tsx`,
  `HourOfDayChart.tsx`, `TokenBreakdownPopover.tsx`.
- `apps/web/src/lib/timeline/cycleMetrics.ts:44-97` — existing per-cycle token sums
  (client-side) to reconcile with server aggregation.

## Tasks

- [ ] Add a server endpoint that serves per-message/per-turn usage for a session
      (so a session can be inspected turn-by-turn), plus a time-bucketed
      tokens/cost series endpoint (backend does the aggregation from the lib
      foundation task).
- [ ] Add a web "Usage" analytics page (or a tokens/cost mode on `UsagePatterns`):
      rolling-window chart, top sessions / projects / tools, reusing existing chart
      components.
- [ ] Add a per-session turn breakdown view highlighting the highest-token turns.
- [ ] Server + component tests; ensure no domain logic leaks into the frontend.

## Acceptance Criteria

- The web UI shows token/cost over time (not just session counts).
- A session can be inspected turn-by-turn to identify the highest-token turns.
- Aggregation happens in Go; the React page only renders server-provided values.
- New endpoints and page covered by tests; `make check` passes.

## Notes

- Splittable if needed: (a) drill-down API + per-turn view, (b) the aggregate
  analytics page. Depends on the lib foundation task; benefits from the attribution
  task (`01kz3q6a4`) for the by-tool breakdown but does not hard-require it.
