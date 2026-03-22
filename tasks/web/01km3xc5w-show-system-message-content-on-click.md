---
title: "Show system message content on click"
id: "01km3xc5w"
status: completed
priority: medium
type: feature
tags: ["ui", "messages"]
created: "2026-03-19"
---

# Show system message content on click

## Objective

When a "System" type message appears in the session view, clicking it currently does nothing. The system message content should be revealed on click, similar to how other collapsible message types work, so users can inspect system prompts and context injected into the conversation.

## Tasks

- [x] Identify how system messages are rendered in `MessageBubble` and why click has no effect
- [x] Add an expandable/collapsible content area for system messages
- [x] Display the raw message content (text blocks) when expanded
- [x] Ensure the collapsed state shows a brief summary or "System message" label
- [x] Style the expanded content consistently with other message types

## Acceptance Criteria

- Clicking a system message in the session view toggles its content visibility
- The expanded view shows the full text content of the system message
- Collapsed state displays a clear label indicating it's a system message
- The interaction is consistent with how other expandable message sections behave in the UI
