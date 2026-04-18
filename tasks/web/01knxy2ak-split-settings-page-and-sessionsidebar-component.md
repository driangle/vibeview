---
id: "01knxy2ak"
title: "Split Settings page and SessionSidebar component"
status: completed
priority: medium
dependencies: []
tags: ["lint", "max-lines", "refactor"]
created: 2026-04-11
completed_at: 2026-04-18
---

# Split Settings page and SessionSidebar component

## Objective

Split `Settings.tsx` (367 lines) and `SessionSidebar.tsx` (219 lines) into smaller modules.

## Tasks

- [x] Split `Settings.tsx` — extract settings sections or form groups into sub-components
- [x] Split `SessionSidebar.tsx` — extract sidebar sections or sub-components

## Acceptance Criteria

- Both files are under 200 lines
- All extracted files are under 200 lines
- No `max-lines` warnings from these files
- Existing behavior and tests pass
