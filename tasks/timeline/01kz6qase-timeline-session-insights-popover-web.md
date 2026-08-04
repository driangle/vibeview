---
id: "01kz6qase"
title: "Timeline: session insights popover (web)"
status: pending
priority: medium
effort: medium
phase: timeline
dependencies: ["01kz6qas1", "01kz6qas9"]
tags: ["frontend", "timeline", "web"]
created_at: 2026-08-04
---

# Timeline: session insights popover (web)

## Objective

Add the "Session insights" popover opened from the timeline toolbar: where the time went
(time-split bar + legend), headline tiles (errors / longest run / tokens-in-top-5), models
used, busiest files, most-run commands, skills loaded, and tool mix — with rows that
click to filter the track.

## Design reference

`~/Downloads/Timeline view design directions-handoff.zip` → `.../Timeline Track.dc.html`
(the `insightsShown` popover: the `Where the {total} went` split bar + 2-col legend, the
three tiles, `Models used` rows, `Busiest files`, `Most-run commands`, `Skills loaded`
chips, and `Tool mix` chips). "click a row to filter the track" is the interaction model.

## Context

- All data comes from `TimelineInsights` ([[01kz6qarv]] via [[01kz6qas1]]) — render as-is;
  no client aggregation.
- Row/chip clicks reuse the search/filter wiring from [[01kz6qas9]] (e.g. clicking a file or
  command sets the search query; clicking the errors tile activates the error filter and
  jumps to the first error).
- Reuse an existing insights UI style if `SessionInsights.tsx` offers reusable pieces;
  otherwise build a self-contained popover (anchored, dismiss on outside click / Esc).

## Tasks

- [ ] Build the insights popover with all sections from the mock.
- [ ] Wire the time-split hatched "Waiting on you" segment and the legend values.
- [ ] Make rows/tiles/chips filter or jump the track via the [[01kz6qas9]] controls.
- [ ] Toggle button in the toolbar (insights on/off) with chevron state.
- [ ] Vitest: sections render from a fixture `TimelineInsights`; a row click sets the
      expected filter/search; popover opens/closes.

## Acceptance Criteria

- The popover shows every insight section populated from server data.
- Clicking a file/command/skill/tool/tile filters or jumps the track as in the mock.
- `npm run typeCheck && npm run lint && npm test` pass in `apps/web`.
