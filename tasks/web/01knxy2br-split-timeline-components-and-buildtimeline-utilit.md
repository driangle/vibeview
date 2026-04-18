---
id: "01knxy2br"
title: "Split timeline components and buildTimeline utility"
status: completed
priority: medium
dependencies: []
tags: ["lint", "max-lines", "refactor"]
created: 2026-04-11
completed_at: 2026-04-18
---

# Split timeline components and buildTimeline utility

## Objective

Split four timeline-related files that are slightly over the 200-line limit: `SessionTimeline.tsx` (204), `TimelineNode.tsx` (214), `TimelineToolLane.tsx` (220), and `buildTimeline.ts` (259).

## Tasks

- [x] Split `buildTimeline.ts` — extract helper functions or type definitions
- [x] Split `TimelineToolLane.tsx` — extract sub-components if feasible
- [x] Split `TimelineNode.tsx` — extract sub-components if feasible
- [x] Split `SessionTimeline.tsx` — extract sub-components or hooks if feasible

## Acceptance Criteria

- All four files are under 200 lines
- No `max-lines` warnings from these files
- Existing behavior and tests pass
