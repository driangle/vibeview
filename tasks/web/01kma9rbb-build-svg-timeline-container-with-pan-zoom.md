---
title: "Build SVG timeline container with pan/zoom"
id: "01kma9rbb"
status: completed
priority: critical
type: feature
tags: ["timeline", "frontend"]
created: "2026-03-22"
dependencies: ["01kma9qsb"]
---

# Build SVG timeline container with pan/zoom

## Objective

Create the `SessionTimeline` component — the SVG viewport shell that hosts all timeline visual elements. Handles pan (drag), zoom (scroll wheel / buttons), and responsive sizing. This is the rendering foundation that all visual layers mount into.

## Tasks

- [x] Create `components/timeline/SessionTimeline.tsx` with an SVG element that fills its container
- [x] Implement pan via mouse drag (track pointer down/move/up, apply translate transform)
- [x] Implement zoom via mouse wheel and +/- button controls (apply scale transform, clamp to min/max)
- [x] Combine pan + zoom into a single `viewTransform` state (`{ x, y, scale }`) applied as SVG `transform`
- [x] Handle responsive container sizing — use `ResizeObserver` or container query to adapt SVG viewBox
- [ ] On narrow viewports, switch to vertical (top-to-bottom) layout orientation (deferred to integration task)
- [x] Add zoom level indicator and reset-zoom button

## Acceptance Criteria

- SVG viewport renders and fills available space
- User can pan by clicking and dragging
- User can zoom with mouse wheel and +/- buttons
- Zoom has sensible min/max bounds
- Container resizes properly when window resizes
- No external dependencies added (pure React + SVG)
