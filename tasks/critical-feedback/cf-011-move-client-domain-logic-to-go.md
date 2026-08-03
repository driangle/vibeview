---
id: "cf-011"
title: "Move client-side domain logic back to Go per CLAUDE.md"
status: pending
priority: high
effort: large
type: improvement
tags: [architecture, frontend, backend]
group: critical-feedback
phase: critical-feedback
touches: ["web/components", "web/lib/extractors", "lib/insights"]
created: 2026-08-03
context:
  - "apps/web/src/components/contribution-graph-builders.ts"
  - "apps/web/src/components/search-messages.ts"
  - "apps/web/src/components/date-range-utils.ts"
  - "apps/web/src/lib/extractors/files/resolveOperations.ts"
  - "apps/web/src/lib/timeline/classifyPhase.ts"
---

# Move client-side domain logic back to Go per CLAUDE.md

## Findings

CLAUDE.md is explicit: *domain logic (state derivation, filtering, classification) lives in
Go; the web client consumes server-provided values and renders only.* Several live modules
violate this:

- **`components/contribution-graph-builders.ts`** — 186 lines of calendar aggregation
  (day/week/month grid construction, Sunday alignment, per-month counting) with hand-rolled,
  timezone-fragile date math (`.setDate`, `.toISOString().slice(0,10)`), even though the
  backend already returns `ActivityDay[]`.
- **`components/search-messages.ts`** — a full second search implementation (snippet +
  ranking) duplicating the `/api/search` endpoint the same page already calls.
- **`lib/extractors/files/resolveOperations.ts`** — reconstructs Read/Write/Edit file-op
  history client-side, including regex-stripping `cat -n` prefixes, though `insights.files`
  is already server-categorized (`FilesTouched.tsx` uses it live).
- **`components/date-range-utils.ts`** — date math and preset-range classification
  (reverse-engineering "Today"/"Last 7 days" by comparing epoch millis).
- **`lib/timeline/classifyPhase.ts`** — a rule-based classification engine (only relevant
  if the timeline is revived; see cf-009).

## Acceptance Criteria

- [ ] Contribution-graph grids are built from server-provided buckets; the client only lays out what Go returns
- [ ] Conversation search uses the server `/api/search` result; the duplicate client-side `searchMessages` is removed (or justified as an explicitly offline-only path)
- [ ] File-operation history comes from server `insights.files`; the client no longer re-parses tool results
- [ ] Any surviving date-range preset classification is server-authoritative or documented as pure presentation
- [ ] Tests cover the Go side of whatever logic moves

## verify
```yaml
verify:
  - type: bash
    run: "npm run typeCheck && npm run lint"
    dir: "apps/web"
  - type: assert
    check: "Contribution grids, conversation search, and file-op history are derived from server-provided values, not recomputed in the browser"
```
