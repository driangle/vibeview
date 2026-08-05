---
id: "01kz6qas3"
title: "Timeline: track table with rows, idle-gap dividers, and empty state (web)"
status: completed
priority: high
effort: medium
phase: timeline
dependencies: ["01kz6qas1"]
tags: ["frontend", "timeline", "web"]
created_at: 2026-08-04
completed_at: 2026-08-04
---

# Timeline: track table with rows, idle-gap dividers, and empty state (web)

## Objective

Build the core Timeline Track: the scrollable table of exchange rows with a sticky column
header, idle-gap dividers between exchanges, row selection, and an empty state. This is the
centerpiece of the view.

## Design reference

`~/Downloads/Timeline view design directions-handoff.zip` → `.../Timeline Track.dc.html`.
Match the row markup and columns:
- Header: `Time · Elapsed · Prompt · Tools · Files · Tokens · Flags` (fixed widths per mock).
- Row: clock · elapsed bar (amber when long, blue otherwise) + duration label · prompt
  (with optional 2nd line: skill chip + first command + `+N more`) · tool chips · first
  file `+N` · token bar + label · flag dots. Selected row = blue tint + left inset bar.
- Idle divider: dashed rule with `idle {duration}` centered.
- Empty state: `filter_alt_off` icon + "No exchanges match these filters" + reset link
  (the reset action is wired in [[01kz6qas9]]).

## Hard constraint

Render server values only (from [[01kz6qary]] via [[01kz6qas1]]); no client-side derivation
of phase/metrics.

## Context

- Colors from the mock: blue `hsl(220 100% 55%)`, error red `#ef4444`, subagent cyan
  `#06b6d4`, thinking violet `#8b5cf6`, approval amber `#eab308`, skill violet `#7c3aed`.
  Map to theme tokens where one exists; keep light/dark aware (Tailwind v4 `@theme` in
  `apps/web/src/index.css`).
- Reuse chip styling precedent from `ModelBadge.tsx`; reuse `formatTokenCount` and the
  shared duration formatter.

## Tasks

- [x] Create the Timeline Track components (new dir, e.g. `components/timeline-track/`):
      column header, row, idle divider, empty state, and the scrolling container.
- [x] Wire row click → selected exchange state (shared with the detail panel task).
- [x] Support the density prop (compact/comfortable) from the mock; comfortable default.
- [x] Vitest: rows render from a fixture `Exchange[]`; idle dividers appear only between
      gapped exchanges; long exchanges get the amber bar; empty list renders the empty state.

## Acceptance Criteria

- The track renders one row per exchange with all seven columns populated from server data.
- Selecting a row updates selection state; visual selected treatment matches the mock.
- `npm run typeCheck && npm run lint && npm test` pass in `apps/web`.
