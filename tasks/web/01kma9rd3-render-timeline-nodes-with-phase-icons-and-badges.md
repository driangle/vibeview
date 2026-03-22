---
title: "Render timeline nodes with phase icons and badges"
id: "01kma9rd3"
status: completed
priority: high
type: feature
tags: ["timeline", "frontend"]
created: "2026-03-22"
dependencies: ["01kma9qsb", "01kma9rbb"]
---

# Render timeline nodes with phase icons and badges

## Objective

Render the interactive nodes along the timeline path — each representing one exchange cycle. Nodes are sized by complexity (token count), styled by phase, and decorated with badge overlays for notable traits (errors, deep thinking, subagents, approval gates).

## Tasks

- [x] Create `components/timeline/TimelineNode.tsx` — renders an SVG group (`<g>`) at the node's layout position
- [x] Implement node sizing: circle radius based on token count bucket (S/M/L/XL)
- [x] Add phase-specific icons inside nodes (e.g., magnifying glass for Research, pencil for Coding, bug for Debugging)
- [x] Implement badge overlays as small positioned indicators: red dot (error), brain icon (deep thinking), fork icon (subagent), pause icon (approval gate)
- [x] Style nodes with phase colors — fill or stroke matching the parent phase region
- [ ] Add subtle entry animation for nodes appearing during live sessions (deferred to integration)
- [x] Handle edge case of very small cycles (single short text message) — render as minimal dots (S size = radius 8)

## Acceptance Criteria

- Nodes render at correct positions from layout engine output
- Node sizes visually distinguish small vs large exchange cycles
- Phase icons are recognizable at default zoom level
- Badges render correctly and don't overlap at normal node density
- Nodes are styled consistently with their parent phase region colors
