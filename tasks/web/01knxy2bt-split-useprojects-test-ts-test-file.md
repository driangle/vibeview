---
id: "01knxy2bt"
title: "Split useProjects.test.ts test file"
status: pending
priority: low
dependencies: []
tags: ["lint", "max-lines", "refactor"]
created: 2026-04-11
---

# Split useProjects.test.ts test file

## Objective

Split `useProjects.test.ts` (236 lines) to stay under the 200-line max-lines limit.

## Tasks

- [ ] Analyze test groupings in `useProjects.test.ts`
- [ ] Split into separate test files by logical concern

## Acceptance Criteria

- All test files are under 200 lines
- No `max-lines` warning
- All tests still pass
