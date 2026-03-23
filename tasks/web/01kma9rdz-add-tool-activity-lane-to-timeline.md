---
title: "Add tool activity lane to timeline"
id: "01kma9rdz"
status: completed
priority: medium
type: feature
tags: ["timeline", "frontend"]
created: "2026-03-22"
dependencies: ["01kma9qsb", "01kma9rbb"]
---

# Add tool activity lane to timeline

## Objective

Add a thin horizontal strip below the main timeline path that shows individual tool calls as small glyphs. This lane provides visual texture for "how much work" happened between user-visible messages — a dense cluster of glyphs signals a heavy work cycle.

## Tasks

- [x] Create `components/timeline/TimelineToolLane.tsx` — renders a row of small glyphs/dots within each cycle's horizontal slot
- [x] Define glyph shapes per tool type: Read (ellipse), Edit (diamond), Write (square), Bash (triangle), Grep/Glob (ring), Agent (star)
- [x] Space glyphs evenly within each cycle slot, scaling down when many tools are used (max 8 visible, overflow indicator)
- [x] Color glyphs to match or complement the parent phase
- [x] Add subtle opacity/size variation to distinguish tool types at a glance
- [ ] At high zoom, show tool name labels next to glyphs; at low zoom, collapse to simple dots (deferred — zoom-level awareness requires integration with container transform state)

## Acceptance Criteria

- Tool lane renders below the main node path
- Each tool call in a cycle produces a visible glyph
- Glyph types are distinguishable for the most common tools (Read, Edit, Bash)
- Dense tool usage is visually apparent without overwhelming the layout
- Lane scales appropriately with zoom level
