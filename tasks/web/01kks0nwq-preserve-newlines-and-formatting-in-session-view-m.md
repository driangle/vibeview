---
title: "Preserve newlines and formatting in session view messages"
id: "01kks0nwq"
status: completed
priority: medium
type: bug
tags: ["ui", "formatting"]
created: "2026-03-15"
---

# Preserve newlines and formatting in session view messages

## Objective

Messages displayed in the session view lose their whitespace formatting. Newlines, indentation, and numbered lists from the original Claude messages are collapsed into flat paragraphs in the web UI.

## Steps to Reproduce

1. Open session `b25ed4e3-b27b-4b29-9bea-fe1095dbaaff` in the web UI
2. Find a Claude message that contains numbered lists or multi-line content
3. Compare the rendered web output to the original terminal output

## Expected Behavior

Messages should preserve their original formatting including:
- Newlines between paragraphs
- Numbered and bulleted lists
- Indentation and code blocks

## Actual Behavior

Newlines are stripped or collapsed, causing numbered lists and structured content to render as a single run-on paragraph. For example, a message with a numbered fallback chain (display, slug, session.id) renders without line breaks between items.

## Tasks

- [x] Identify how message content is currently rendered in the SessionView component
- [x] Ensure message text is rendered with whitespace preservation (e.g. markdown rendering or `whitespace-pre-wrap`)
- [x] Verify numbered lists, blank lines, and indentation display correctly
- [x] Test with session `b25ed4e3-b27b-4b29-9bea-fe1095dbaaff` as a reference case

## Acceptance Criteria

- Multi-line messages render with their original line breaks preserved
- Numbered and bulleted lists display as separate lines
- Indented content retains its indentation
- No regression in single-line message display
