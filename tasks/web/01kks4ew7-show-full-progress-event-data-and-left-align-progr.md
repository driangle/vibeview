---
title: "Show full progress event data and left-align progress lines"
id: "01kks4ew7"
status: pending
priority: medium
type: feature
tags: ["ui"]
created: "2026-03-15"
---

# Show full progress event data and left-align progress lines

## Objective

Allow users to see the full progress event data on each progress line in the session view, instead of truncating to 80 characters. Also, left-align progress lines instead of centering them, so they match the layout of other message types.

## Tasks

- [ ] Remove the 80-character truncation on progress event data display in `SystemMessage` component (`MessageBubble.tsx`)
- [ ] Show the full JSON data for each progress event
- [ ] Change progress line layout from `justify-center` to left-aligned
- [ ] Remove the centered pill/badge styling in favor of a left-aligned block style

## Acceptance Criteria

- Progress events display their full `data` JSON without truncation
- Progress lines are left-aligned in the message list
- Long progress data wraps or scrolls rather than being cut off
