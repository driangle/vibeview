---
id: "cf-012"
title: "Make session-list sort and aggregate stats server-authoritative"
status: completed
priority: high
effort: medium
type: bug
tags: [correctness, frontend, backend, api]
group: critical-feedback
phase: critical-feedback
touches: ["web/hooks/useSessionListData", "web/hooks/useSessionSort", "web/pages/SessionList", "cli/server"]
created: 2026-08-03
context:
  - "apps/web/src/hooks/useSessionListData.ts"
  - "apps/web/src/hooks/useSessionSort.ts"
  - "apps/web/src/pages/SessionList.tsx"
  - "apps/cli/internal/server/server.go"
completed_at: 2026-08-03
---

# Make session-list sort and aggregate stats server-authoritative

## Findings

Two confirmed correctness bugs, both rooted in deriving over the server-paginated page
instead of the full dataset:

### Sort only sorts the current page
`buildSessionsUrl` sends `limit`/`offset` but **no sort param**
(useSessionListData.ts:25-27), and `useSessionSort` (useSessionSort.ts:36) reorders the
array it is given — the current page (`SessionList.tsx` passes the paginated `sessions`).
So "sort by cost desc" only reorders the ~N visible rows within the server's default
ordering; pagination and sort are mutually inconsistent.

### Stat cards mix scopes
`totalTokens`/`totalCost` are computed by reducing over `displaySessions` — the current
page only (useSessionListData.ts:126-132) — while the adjacent "Sessions" card shows
`statsTotal`, the true filtered total (line 124). Users see a global session count next to
per-page token/cost totals.

## Acceptance Criteria

- [x] Add a sort parameter to the sessions API and `buildSessionsUrl`; sort server-side so pagination and sort agree
- [x] Compute aggregate token/cost totals over the full filtered set (server-provided), or clearly label the cards as page-scoped
- [x] Ensure the "Sessions" count and the token/cost totals share the same scope
- [x] Tests: server sort ordering across pages; stat totals match the labeled scope

## verify
```yaml
verify:
  - type: bash
    run: "go test ./internal/server/... -run Sessions -v"
    dir: "apps/cli"
  - type: bash
    run: "npm run typeCheck && npm run lint"
    dir: "apps/web"
  - type: assert
    check: "Sorting reorders the whole result set across pages, and the stat cards' totals share scope with the session count"
```
