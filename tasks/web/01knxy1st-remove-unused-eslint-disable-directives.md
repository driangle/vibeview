---
id: "01knxy1st"
title: "Remove unused eslint-disable directives"
status: completed
priority: high
dependencies: []
tags: ["lint", "quick-fix"]
created: 2026-04-11
---

# Remove unused eslint-disable directives

## Objective

Remove 2 unused `eslint-disable` directives that produce lint warnings. These are auto-fixable with `--fix`.

## Tasks

- [x] Remove unused `eslint-disable react-hooks/set-state-in-effect` at `apps/web/src/components/DateRangeFilter.tsx:271`
- [x] Remove unused `eslint-disable react-hooks/set-state-in-effect` at `apps/web/src/components/timeline/SessionTimeline.tsx:77`

## Acceptance Criteria

- Both unused eslint-disable comments are removed
- `make lint` passes with no warnings from these files
