---
id: "01knxy28m"
title: "Split SessionView and SessionList pages"
status: completed
priority: medium
dependencies: []
tags: ["lint", "max-lines", "refactor"]
created: 2026-04-11
---

# Split SessionView and SessionList pages

## Objective

Split `SessionView.tsx` (441 lines) and `SessionList.tsx` (380 lines) into smaller modules.

## Tasks

- [x] Analyze `SessionView.tsx` and extract sub-components or hooks
- [x] Analyze `SessionList.tsx` and extract sub-components or hooks
- [x] Verify both files are under 200 lines

## Acceptance Criteria

- `SessionView.tsx` and `SessionList.tsx` are each under 200 lines
- All extracted files are under 200 lines
- No `max-lines` warnings from these files
- Existing behavior and tests pass
