---
id: "audit-012c"
title: "Add fuzz tests and expand server/session coverage"
status: pending
priority: high
effort: medium
tags: [testing]
group: audit
parent: "audit-012"
created: 2026-03-26
touches: ["cli/search", "cli/server", "cli/session"]
context:
  - "apps/cli/internal/search/search.go"
  - "apps/cli/internal/server/server_test.go"
  - "apps/cli/internal/session/session_test.go"
---

# Add fuzz tests and expand server/session coverage

## Objective

Add fuzz tests for the JSONL parser functions that handle arbitrary input, and expand the existing server and session test suites from ~35% to 60%+ coverage.

## Tasks

- [ ] Add fuzz test for `ParseMessageLine`
- [ ] Add fuzz test for `ParseHistoryLine`
- [ ] Expand `server_test.go` to cover more endpoints and error paths
- [ ] Expand `session_test.go` to cover more session operations and edge cases

## Acceptance Criteria

- [ ] Fuzz tests exist for `ParseMessageLine` and `ParseHistoryLine`
- [ ] Server test coverage reaches 60%+
- [ ] Session test coverage reaches 60%+
