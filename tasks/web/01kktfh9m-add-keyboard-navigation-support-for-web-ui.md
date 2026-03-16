---
title: "Add keyboard navigation support for web UI"
id: "01kktfh9m"
status: completed
priority: medium
type: feature
tags: ["ui", "accessibility", "navigation"]
created: "2026-03-16"
---

# Add keyboard navigation support for web UI

## Objective

Add keyboard navigation to the web UI so users can navigate the site without a mouse. Arrow keys, Enter, and Escape should provide intuitive navigation across the session table and session detail views.

## Tasks

- [x]Implement up/down arrow key navigation to move between rows in the session table
- [x]Implement Enter or right arrow to open/enter a selected row (navigate into session detail)
- [x]Implement left arrow or Escape to go back (e.g., from session detail to session list)
- [x]Add visible focus indicator to highlight the currently selected row/item
- [x]Implement up/down navigation within the session detail view to iterate over messages
- [x]Ensure keyboard navigation works alongside existing mouse/click interactions
- [x]Handle edge cases: top/bottom of list bounds, empty states, loading states

## Acceptance Criteria

- Pressing up/down arrows in the session table moves the focused row highlight
- Pressing Enter or right arrow on a focused session row navigates to that session's detail view
- Pressing left arrow or Escape from a session detail view navigates back to the session list
- In the session detail view, up/down arrows scroll through messages
- A visible focus indicator clearly shows which item is currently selected
- Keyboard navigation does not interfere with normal text input in any input fields
- Navigation wraps or stops at list boundaries (no errors on out-of-bounds)
