---
title: "Add dedicated widget for AskUserQuestion tool calls"
id: "01kma52jj"
status: pending
priority: medium
type: feature
tags: ["ui"]
created: "2026-03-22"
---

# Add dedicated widget for AskUserQuestion tool calls

## Objective

Add a dedicated widget for rendering `AskUserQuestion` tool calls in the message view, similar to the existing `EditDiffBlock` widget. The `AskUserQuestion` tool presents structured questions with options (single-select and multi-select) to the user. The widget should render these questions and their options in a readable, form-like layout instead of showing raw JSON.

## Tasks

- [ ] Create `AskUserQuestionWidget` component that renders structured question data (headers, options with labels/descriptions, single vs multi-select indicators)
- [ ] Add case for `AskUserQuestion` in `ToolCallBlock.tsx` dispatcher to route to the new widget
- [ ] Render the tool result (user's selected answers) when available
- [ ] Use a distinct color scheme (e.g. blue/indigo) to differentiate from standard tool call widgets

## Acceptance Criteria

- `AskUserQuestion` tool calls render as a structured widget showing each question with its header and options
- Single-select vs multi-select questions are visually distinguishable
- When a result exists, the user's selected answers are displayed
- Widget follows the existing expandable/collapsible pattern used by other tool widgets
- Falls back gracefully if the input JSON structure is unexpected
