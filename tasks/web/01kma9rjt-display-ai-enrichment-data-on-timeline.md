---
title: "Display AI enrichment data on timeline"
id: "01kma9rjt"
status: pending
priority: low
type: feature
tags: ["timeline", "frontend", "ai-enrichment"]
created: "2026-03-22"
dependencies: ["01kma9rgj", "01kma9rhy"]
---

# Display AI enrichment data on timeline

## Objective

When AI enrichment data is available for a session, overlay it onto the timeline — showing human-readable node titles, phase summaries, intent tags, key decision markers, and a narrative summary banner. Provide a button to trigger enrichment for sessions that haven't been enriched yet.

## Tasks

- [ ] Add `useSessionEnrichment(sessionId)` hook that fetches `GET /api/sessions/{id}/enrichment` (returns null if not enriched)
- [ ] Add "Enrich with AI" button in the timeline header — triggers `POST /api/sessions/{id}/enrich` with loading state
- [ ] When enrichment data exists, replace node tooltips' prompt previews with `CycleEnrichment.title`
- [ ] Display `PhaseEnrichment.summary` as a subtitle in phase region labels
- [ ] Render `intentTags` as small pill badges near enriched nodes
- [ ] Mark `KeyDecision` cycles with a special diamond/star badge overlay
- [ ] Show `narrative` summary as a collapsible banner above the timeline
- [ ] Handle loading state during enrichment (spinner on button, optimistic UI update on completion)
- [ ] Add TypeScript types matching the `SessionEnrichment` backend schema

## Acceptance Criteria

- "Enrich with AI" button is visible and functional when no enrichment exists
- Enriched timelines show AI-generated titles, summaries, tags, and key decisions
- Unenriched timelines work identically to before (graceful degradation)
- Loading state is clear during the enrichment process
- Enrichment data persists — refreshing the page shows cached enrichment
