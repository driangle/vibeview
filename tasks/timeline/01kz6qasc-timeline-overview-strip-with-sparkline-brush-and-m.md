---
id: "01kz6qasc"
title: "Timeline: overview strip with sparkline, brush, and model bands (web)"
status: completed
priority: medium
effort: medium
phase: timeline
dependencies: ["01kz6qas1"]
tags: ["frontend", "timeline", "web"]
created_at: 2026-08-04
completed_at: 2026-08-05
---

# Timeline: overview strip with sparkline, brush, and model bands (web)

## Objective

Add the overview strip above the track: a token sparkline (error-colored buckets), a brush
rectangle indicating the viewed range, and a model-band ribbon whose segments jump to the
first exchange of each model run. Render server-provided buckets/bands.

## Design reference

`~/Downloads/Timeline view design directions-handoff.zip` → `.../Timeline Track.dc.html`
(the "overview strip": `Session · tokens / model` label, the `overview` sparkline bars with
the blue brush overlay, the `bandRuns` model ribbon with tooltips, and the `09:12 → {end}`
clock range). Show/hide behind the `showOverview` prop from the mock.

## Context

- Data comes from `TimelineInsights` ([[01kz6qarv]] via [[01kz6qas1]]): `overviewBuckets`
  (`{tokens, errorLevel}`) and `modelBands` (`{short, startPct, widthPct, firstExchangeIndex}`).
- Bucket color by error level: 0 → blue, 1 → faded red, 2+ → solid red (per mock).
- Band segment click sets the selected exchange to `firstExchangeIndex`.
- Keep the brush presentational for now (reflects range; full drag-to-zoom is optional and
  can be a follow-up) unless trivial to wire to the scroll position.

## Tasks

- [x] Build the overview strip component (sparkline + brush + model bands + clock range).
- [x] Wire band clicks to selection; color buckets by error level.
- [x] Respect a `showOverview` toggle (default on).
- [x] Vitest: buckets render with correct error coloring; band click selects the right
      exchange; hidden when `showOverview` is off.

## Acceptance Criteria

- The overview strip renders from server buckets/bands and sits above the track.
- Clicking a model band selects that model's first exchange.
- `npm run typeCheck && npm run lint && npm test` pass in `apps/web`.
