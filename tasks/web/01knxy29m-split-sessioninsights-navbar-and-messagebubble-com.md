---
id: "01knxy29m"
title: "Split SessionInsights, NavBar, and MessageBubble components"
status: completed
priority: medium
dependencies: []
tags: ["lint", "max-lines", "refactor"]
created: 2026-04-11
completed_at: 2026-04-12
---

# Split SessionInsights, NavBar, and MessageBubble components

## Objective

Split three oversized components: `SessionInsights.tsx` (399 lines), `NavBar.tsx` (335 lines), and `MessageBubble.tsx` (354 lines).

## Tasks

- [x] Split `SessionInsights.tsx` — extract insight sub-components or sections
- [x] Split `NavBar.tsx` — extract nav items, menus, or sub-components
- [x] Split `MessageBubble.tsx` — extract content renderers or sub-components

## Acceptance Criteria

- All three files are under 200 lines
- All extracted files are under 200 lines
- No `max-lines` warnings from these files
- Existing behavior and tests pass
