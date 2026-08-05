---
id: "01kz6qash"
title: "Timeline: remove dead SVG timeline subsystem and close cf-009 (web)"
status: completed
priority: medium
effort: small
phase: timeline
dependencies: ["01kz6qas6", "01kz6qas9", "01kz6qasc", "01kz6qase"]
tags: ["frontend", "timeline", "web", "dead-code"]
created_at: 2026-08-04
completed_at: 2026-08-05
---

# Timeline: remove dead SVG timeline subsystem and close cf-009 (web)

## Objective

Once the new Timeline Track fully replaces the old SVG timeline, remove the now-dead
SVG subsystem and the client-side domain logic that only fed it, satisfying the original
cf-009 acceptance criteria ("no unreferenced timeline modules remain") and the CLAUDE.md /
cf-011 rule that this logic lives in Go.

## Design reference

`~/Downloads/Timeline view design directions-handoff.zip` (the Track view that supersedes
the SVG view). No new UI in this task — it is cleanup after the new view ships.

## Context

- Old SVG components (`apps/web/src/components/timeline/*`) and SVG-only lib code
  (`layoutEngine.ts`, `viewTransform.ts`, and the layout/`NodeLayout`/`PhaseRegionLayout`
  types in `lib/timeline/types.ts`) are replaced by the new server-driven Track.
- The temporary `TimelineView` preview import/toggle in `SessionView.tsx` is gone once the
  tab switch from [[01kz6qas1]] lands — confirm nothing references the old view.
- cf-009 also flags `lib/extractors/*` and client `cycleMetrics`/`classifyPhase` as existing
  solely to feed the dead timeline. With derivation now in Go, audit these: remove modules
  no longer referenced by any mounted component; keep only genuinely still-used helpers.
- Related task in the group: [[cf-009]] (this closes it) and cf-011 (Go migration, now done
  for the timeline path).

## Tasks

- [x] Delete the old SVG timeline components and SVG-only lib code + types.
- [x] Audit `lib/extractors/*`, `lib/timeline/{buildTimeline,cycleMetrics,classifyPhase,
      phaseTheme}.ts`: remove what is now unreferenced; keep what the new view/tests use.
- [x] Grep to confirm no remaining imports of removed modules; update the barrel `index.ts`.
- [x] Run the cf-009 verify checks; mark cf-009 completed.

## Acceptance Criteria

- No unreferenced timeline/extractor modules remain (grep clean).
- `npm run typeCheck && npm run lint && npm test` pass; `make check` passes.
- cf-009 acceptance criteria are met and the task is closed.

## verify
```yaml
verify:
  - type: bash
    run: "npm run typeCheck && npm run lint && npm test"
    dir: "apps/web"
  - type: assert
    check: "The old SVG timeline is fully removed; the new server-driven Timeline Track tab renders exchanges; no dead timeline/extractor modules remain"
```
