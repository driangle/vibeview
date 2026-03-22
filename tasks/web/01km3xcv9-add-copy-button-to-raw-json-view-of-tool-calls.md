---
title: "Add copy button to raw JSON view of tool calls"
id: "01km3xcv9"
status: completed
priority: low
type: feature
tags: ["ui", "messages"]
created: "2026-03-19"
---

# Add copy button to raw JSON view of tool calls

## Objective

When viewing the raw JSON of a tool call in the session view, there is no way to copy the JSON to the clipboard. Add a "Copy" button to the raw JSON view so users can easily copy tool call input/output for debugging or sharing.

## Tasks

- [x] Locate the raw JSON view component for tool calls in `MessageBubble` or related components
- [x] Add a "Copy" button (clipboard icon) positioned in the top-right corner of the JSON block
- [x] Implement copy-to-clipboard using the Clipboard API
- [x] Show brief feedback on successful copy (e.g. "Copied!" tooltip or icon change)

## Acceptance Criteria

- A copy button is visible when viewing raw JSON of a tool call
- Clicking the button copies the full JSON content to the clipboard
- Visual feedback confirms the copy action succeeded
- The button does not interfere with reading or selecting the JSON content
