---
id: "cf-014"
title: "Add frontend tests for the untested critical logic"
status: completed
priority: medium
effort: medium
type: chore
tags: [testing, frontend]
group: critical-feedback
phase: critical-feedback
touches: ["web/hooks", "web/components", "web/lib"]
created: 2026-08-03
context:
  - "apps/web/src/hooks/useSessionStream.ts"
  - "apps/web/src/components/contribution-graph-builders.ts"
  - "apps/web/src/components/search-messages.ts"
  - "apps/web/src/components/date-range-utils.ts"
completed_at: 2026-08-03
---

# Add frontend tests for the untested critical logic

## Findings

~10 test files cover 70 components + ~40 lib/hook modules, and the covered code is the
code least likely to break (`ActivityBadge`, `ConfirmDialog`, `Pagination`, etc.). Every
high-risk module has **zero** tests, directly violating the project's own "test all new
behavior" principle:

- `useSessionStream` — SSE dedup and exponential-backoff reconnect
- `contribution-graph-builders` — fragile date/timezone math
- `search-messages` — snippet extraction + ranking
- `date-range-utils` — preset-range classification
- the `extractors/*` and `parsers/*` derivation modules

(If cf-009/cf-011 delete or relocate some of these, test whatever survives — server-side
where the logic moves.)

## Acceptance Criteria

- [x] Tests for `useSessionStream` dedup + reconnect behavior (mocked EventSource)
- [x] Tests for any surviving client-side date math and preset-range classification, including timezone edge cases
- [x] Tests for any surviving client-side search/snippet logic
- [x] Coverage added for the highest-risk derivation modules that remain after cf-009/cf-011

## verify
```yaml
verify:
  - type: bash
    run: "npm test"
    dir: "apps/web"
  - type: assert
    check: "The SSE stream hook and any surviving client-side date/search derivation have passing unit tests, including edge cases"
```
