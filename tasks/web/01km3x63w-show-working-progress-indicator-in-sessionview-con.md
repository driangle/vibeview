---
title: "Show working progress indicator in SessionView conversation"
id: "01km3x63w"
status: completed
priority: medium
type: feature
tags: ["ui", "sessions"]
created: "2026-03-19"
---

# Show working progress indicator in SessionView conversation

## Objective

When viewing a session's conversation in `SessionView`, show a visual progress indicator near the bottom of the conversation (last page / latest tip) whenever the session's `activityState` is `'working'`. This gives users immediate feedback that Claude is actively processing, without needing to scroll up to the header badge.

## Tasks

- [x] Detect `activityState === 'working'` from the session data already available via `useSessionData` (which exposes `liveActivityState`)
- [x] Create a `WorkingIndicator` component that renders an animated progress message (e.g., pulsing dot + "Claude is working..." text)
- [x] Render `WorkingIndicator` at the bottom of the conversation message list in `SessionView` when the session is in working state
- [x] Ensure the indicator is visible when auto-scrolled to the latest message (follows the "tip" of the conversation)
- [x] Hide the indicator when `activityState` transitions away from `'working'`

## Acceptance Criteria

- A progress indicator appears at the bottom of the conversation in `SessionView` when `activityState` is `'working'`
- The indicator is not shown for other activity states (`idle`, `waiting_for_input`, `waiting_for_approval`)
- The indicator is visible on the last page of the conversation without manual scrolling
- The indicator disappears when the session stops working
