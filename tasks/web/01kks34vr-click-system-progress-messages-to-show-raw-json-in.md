---
id: "01kks34vr"
title: "Click system/progress messages to show raw JSON in modal"
status: completed
priority: medium
dependencies: []
tags: ["web"]
created: 2026-03-15
---

# Click system/progress messages to show raw JSON in modal

## Objective

System and progress messages in the session view currently show a truncated preview (first 80 chars of JSON). Users have no way to inspect the full raw message data. Make the SystemMessage pill clickable so it opens the existing `RawJsonModal` with the complete message object.

## Tasks

- [ ] Add click handler and `useState` for modal visibility in `SystemMessage` component (`MessageBubble.tsx`)
- [ ] Render `RawJsonModal` with the full `message` object when open
- [ ] Style the pill with `cursor-pointer` and hover state to indicate clickability

## Acceptance Criteria

- Clicking a system or progress message pill opens `RawJsonModal` showing the full raw JSON of the message
- Modal closes via Escape key, clicking the X button, or clicking the overlay
- The pill visually indicates it is clickable (cursor + hover effect)
