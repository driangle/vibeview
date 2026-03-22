---
title: "Add view toggle and wire timeline into SessionView"
id: "01kma9rgj"
status: completed
priority: high
type: feature
tags: ["timeline", "frontend"]
created: "2026-03-22"
dependencies: ["01kma9rbb", "01kma9rcf", "01kma9rd3", "01kma9rfw"]
---

# Add view toggle and wire timeline into SessionView

## Objective

Integrate the timeline into the existing SessionView page with a toggle control that lets users switch between the classic list view and the new timeline view. The selected view preference should persist in user settings.

## Tasks

- [x] Add a `[List View] [Timeline View]` toggle control to the SessionView header
- [x] Conditionally render either the existing paginated message list or the `SessionTimeline` component based on toggle state
- [x] Persist the selected view in user settings (using `useLocalStorage` hook)
- [x] Pass `useSessionData` output through `buildTimeline()` to produce `TimelineData` for the timeline view
- [x] Ensure live streaming updates work in timeline mode (useMemo re-runs on messages change)
- [x] Handle empty state — show a placeholder when session has no messages yet

## Acceptance Criteria

- Toggle control is visible in SessionView header
- Switching between views is instant (no page reload)
- Selected view preference persists across page navigations and sessions
- Both views consume the same underlying data from `useSessionData`
- Timeline view receives live updates when the session is active
- Existing list view behavior is unchanged
