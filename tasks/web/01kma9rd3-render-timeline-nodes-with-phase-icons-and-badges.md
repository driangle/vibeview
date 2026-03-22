---
title: "Render timeline nodes with phase icons and badges"
id: "01kma9rd3"
status: pending
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

- [ ] Create `components/timeline/TimelineNode.tsx` — renders an SVG group (`<g>`) at the node's layout position
- [ ] Implement node sizing: circle radius based on token count bucket (S/M/L/XL)
- [ ] Add phase-specific icons inside nodes (e.g., magnifying glass for Research, pencil for Coding, bug for Debugging)
- [ ] Implement badge overlays as small positioned indicators: red dot (error), brain icon (deep thinking), fork icon (subagent), pause icon (approval gate)
- [ ] Style nodes with phase colors — fill or stroke matching the parent phase region
- [ ] Add subtle entry animation for nodes appearing during live sessions
- [ ] Handle edge case of very small cycles (single short text message) — render as minimal dots

## Acceptance Criteria

- Nodes render at correct positions from layout engine output
- Node sizes visually distinguish small vs large exchange cycles
- Phase icons are recognizable at default zoom level
- Badges render correctly and don't overlap at normal node density
- Nodes are styled consistently with their parent phase region colors
