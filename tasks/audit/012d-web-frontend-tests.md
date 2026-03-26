---
id: "audit-012d"
title: "Set up Vitest and add React component tests"
status: completed
priority: high
effort: medium
tags: [testing]
group: audit
parent: "audit-012"
created: 2026-03-26
touches: ["web"]
context:
  - "apps/web/src/"
---

# Set up Vitest and add React component tests

## Objective

The web frontend has 9,414 LOC with zero tests. Set up Vitest + React Testing Library and add initial tests for the most critical components.

## Tasks

- [x] Install and configure Vitest + React Testing Library + jsdom in `apps/web`
- [x] Add `vitest.config.ts` and test setup file
- [x] Add test script to `apps/web/package.json`
- [x] Write at least 3 component tests for critical paths (e.g., session list, session detail, cost display)

## Acceptance Criteria

- [x] Vitest is configured and `npm test` runs in `apps/web`
- [x] At least 3 React component tests exist and pass
