---
title: "Render phase regions and connection path"
id: "01kma9rcf"
status: pending
priority: high
type: feature
tags: ["timeline", "frontend"]
created: "2026-03-22"
dependencies: ["01kma9qsb", "01kma9rbb"]
---

# Render phase regions and connection path

## Objective

Render the two base visual layers of the timeline: soft colored background rectangles for each phase region, and a smooth SVG path connecting all nodes in sequence. These layers provide the visual foundation that nodes and other elements sit on top of.

## Tasks

- [ ] Create `components/timeline/TimelinePhaseRegion.tsx` — renders a rounded rectangle with the phase's color, spanning the combined width of its constituent cycle slots
- [ ] Define phase color palette (Blue/Planning, Indigo/Research, Green/Coding, Amber/Testing, Orange/Debugging, Purple/DevOps, Slate/Configuration, Gray/Conversation) with light/dark mode variants
- [ ] Add floating phase name labels positioned above each region
- [ ] Create the connection path — a smooth SVG `<path>` using cubic bezier curves through all node center points
- [ ] Style the connection path with a subtle stroke that complements the phase colors
- [ ] Add timestamp annotations at key interval points along the timeline

## Acceptance Criteria

- Phase regions render as colored rectangles with correct widths based on layout data
- Each phase type has a distinct, visually appealing color that works in both light and dark mode
- Phase name labels are readable and positioned clearly
- Connection path flows smoothly through all node positions without sharp corners
- Regions and path update correctly when layout data changes
