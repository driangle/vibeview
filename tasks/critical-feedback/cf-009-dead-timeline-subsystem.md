---
id: "cf-009"
title: "Remove or wire up the dead timeline subsystem (~1,800 LOC)"
status: pending
priority: high
effort: large
type: chore
tags: [dead-code, frontend, architecture]
group: critical-feedback
phase: critical-feedback
touches: ["web/lib/timeline", "web/components/timeline", "web/lib/extractors"]
created: 2026-08-03
context:
  - "apps/web/src/lib/timeline/"
  - "apps/web/src/components/timeline/"
  - "apps/web/src/lib/extractors/"
---

# Remove or wire up the dead timeline subsystem (~1,800 LOC)

## Resolution

Decision made: **wire it up** as a real, routed feature using the designer's Timeline Track
view, with the domain logic moved to Go (per cf-011). The work is decomposed into the
`timeline` task group (`tasks/timeline/`), phases backend → web → cleanup. This task is
closed by [[01kz6qash]] (removes the dead SVG subsystem after the new Track view ships).
Design handoff: `~/Downloads/Timeline view design directions-handoff.zip`.

## Findings

The entire `timeline/` subsystem is imported by **no mounted component**. Verified: a grep
of all of `src` for `TimelineView`, `SessionTimeline`, `lib/timeline`, and
`components/timeline` outside those directories returns nothing, and no route/page in
`pages/` or `App.tsx` references it.

Dead surface:
- `lib/timeline/` — 6 files: `buildTimeline`, `classifyPhase`, `cycleMetrics`,
  `layoutEngine`, `phaseTheme`, `types`
- `components/timeline/` — 12 files: `TimelineView`, `SessionTimeline`, `TimelineNode`,
  `TimelineDetailPanel`, `TimelineToolLane`, etc.

Roughly **~1,800 lines** — the most complex code in the app — is never rendered. Worse, a
large fraction of `lib/extractors/` (tools, commands, errors, subagents,
`files/fromToolUseBlocks`) exists **solely** to feed `cycleMetrics.extractFeatures` → the
dead timeline (`errors/fromToolResults.ts:30` even comments "Lightweight check for
buildTimeline"). This is unused surface carrying maintenance cost and the appearance of a
feature that ships nothing.

Note: this code also contains the worst CLAUDE.md violations (client-side phase
classification/derivation), which cf-011 covers if the code is instead revived server-side.

## Acceptance Criteria

- [ ] Decide: delete the timeline subsystem, or re-introduce it as a real, routed feature
- [ ] If deleting: remove `lib/timeline/` and `components/timeline/`, plus the `lib/extractors/` modules that exist only to feed it, and confirm `npm run typeCheck`/`lint`/`test` stay green
- [ ] If keeping: mount it behind a route/toggle and move its domain logic to Go per cf-011
- [ ] No unreferenced timeline modules remain after the change

## verify
```yaml
verify:
  - type: bash
    run: "npm run typeCheck && npm run lint"
    dir: "apps/web"
  - type: assert
    check: "The timeline code is either rendered by a mounted route or fully removed; no dead timeline/extractor modules remain"
```
