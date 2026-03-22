---
title: "Add timeline node interactions (hover tooltips, detail panel, phase click)"
id: "01kma9rfw"
status: completed
priority: high
type: feature
tags: ["timeline", "frontend"]
created: "2026-03-22"
dependencies: ["01kma9rd3", "01kma9rcf"]
---

# Add timeline node interactions (hover tooltips, detail panel, phase click)

## Objective

Make the timeline interactive — hovering nodes shows summary tooltips, clicking a node opens a detail panel with the full message content, and clicking a phase region highlights its nodes and shows aggregate stats. This bridges the spatial overview with the detailed content users need.

## Tasks

- [x] Add hover handler to `TimelineNode` — show a tooltip with: user prompt preview (first ~100 chars), phase label, tool count, cost, duration (TimelineTooltip component)
- [x] Create `components/timeline/TimelineDetailPanel.tsx` — a side panel that renders full message content using the existing `MessageBubble` component
- [x] Add click handler to `TimelineNode` — opens the detail panel for the selected cycle (onHover/onClick props on TimelineNode)
- [x] Add click handler to `TimelinePhaseRegion` — highlights all nodes in that phase, shows phase summary (total cycles, total cost, total duration, tool breakdown)
- [x] Implement selected/highlighted node states with visual emphasis (selection ring on TimelineNode, highlight stroke on PhaseRegion)
- [ ] Add keyboard navigation: arrow keys to move between nodes, Enter to open detail, Escape to close (deferred to integration)
- [x] Handle panel open/close transitions smoothly

## Acceptance Criteria

- Hovering a node shows a tooltip with the correct summary data
- Clicking a node opens the detail panel with the full exchange content
- Clicking a phase region highlights its nodes and displays aggregate stats
- Detail panel reuses existing MessageBubble for rendering message content
- Keyboard navigation works for accessibility
- Only one node/panel is selected at a time
