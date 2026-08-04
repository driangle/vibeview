---
id: "01kz6qas1"
title: "Timeline: TS types, data plumbing, and Conversation|Timeline tab (web)"
status: pending
priority: high
effort: medium
phase: timeline
dependencies: ["01kz6qary"]
tags: ["frontend", "timeline", "web"]
created_at: 2026-08-04
---

# Timeline: TS types, data plumbing, and Conversation|Timeline tab (web)

## Objective

Lay the frontend foundation for the Timeline Track: TypeScript types mirroring the new
server DTOs, plumbing the `timeline` payload through the session data hook, and a
**Conversation | Timeline** tab switch in `SessionView` that replaces the temporary
`showTimeline` preview toggle. This task establishes the shell that tasks 6–10 fill in.

## Design reference

`~/Downloads/Timeline view design directions-handoff.zip` → `.../Timeline Track.dc.html`
— the tab bar (`Conversation` / `Timeline`, active underline) and the overall two-tab layout.

## Hard constraint

**Do not modify the conversation view.** The Conversation tab renders the existing
`ConversationFlow` and its children unchanged. Only the tab shell and the new Timeline
container are added.

## Context

- `SessionDetail` and related types live in `apps/web/src/types.ts`. Add `Exchange`,
  `TimelineInsights`, `TimelineResponse`, and `SessionDetail.timeline?`.
- `useSessionData` (`apps/web/src/hooks/useSessionData.ts`) fetches
  `GET /api/sessions/{id}` via SWR and returns a big object; surface `timeline` from
  `session.timeline`.
- `SessionView.tsx` currently has the temporary `showTimeline` boolean + button
  (~lines 25, 161–178) swapping `ConversationFlow`/`TimelineView`. Replace with a real tab
  state (`'conversation' | 'timeline'`) and a small segmented control (no tab component
  exists yet — build a minimal one; canonical secondary-button styling is in the repo).
- Promote a shared ms-duration + clock formatter (currently duplicated in
  `TimelineTooltip`/`TimelineDetailPanel`) into a shared util; reuse `formatTokenCount`,
  `formatCost` from `apps/web/src/utils.ts`.

## Tasks

- [ ] Add the timeline TS types to `types.ts`, matching the Go JSON tags exactly.
- [ ] Thread `timeline` through `useSessionData` (and the subagent path if applicable).
- [ ] Add a `Conversation | Timeline` tab switch to `SessionView`; Conversation renders the
      untouched `ConversationFlow`; Timeline renders a new placeholder container that
      receives the `timeline` data.
- [ ] Add a shared duration/clock formatter util with a unit test.
- [ ] Vitest for the tab switch (renders the right pane) and the new formatter.

## Acceptance Criteria

- The Timeline tab is reachable in `SessionView`; the Conversation tab is unchanged in
  behavior and code.
- `timeline` data is available to the Timeline container as typed values.
- `npm run typeCheck && npm run lint && npm test` pass in `apps/web`.
