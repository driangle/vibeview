---
id: "01knxy2a3"
title: "Split DateRangeFilter, ConversationSearch, and FileViewer components"
status: pending
priority: medium
dependencies: []
tags: ["lint", "max-lines", "refactor"]
created: 2026-04-11
---

# Split DateRangeFilter, ConversationSearch, and FileViewer components

## Objective

Split three oversized components: `DateRangeFilter.tsx` (422 lines), `ConversationSearch.tsx` (292 lines), and `FileViewer.tsx` (235 lines).

## Tasks

- [ ] Split `DateRangeFilter.tsx` — extract calendar/picker sub-components or date utilities
- [ ] Split `ConversationSearch.tsx` — extract search results, filters, or sub-components
- [ ] Split `FileViewer.tsx` — extract viewer sub-components or utilities

## Acceptance Criteria

- All three files are under 200 lines
- All extracted files are under 200 lines
- No `max-lines` warnings from these files
- Existing behavior and tests pass
