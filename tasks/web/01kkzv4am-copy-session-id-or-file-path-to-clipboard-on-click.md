---
title: "Copy session ID or file path to clipboard on click in Session View"
id: "01kkzv4am"
status: pending
priority: medium
type: feature
tags: ["ui"]
created: "2026-03-18"
---

# Copy session ID or file path to clipboard on click in Session View

## Objective

Make the session ID and file path in the Session View header automatically copy their value to the clipboard when clicked, with brief visual feedback confirming the copy.

## Tasks

- [ ] Add click-to-copy behavior on the session ID `<span>` in `SessionView.tsx`
- [ ] Add click-to-copy behavior on the file path `<div>` in `SessionView.tsx`
- [ ] Show brief visual feedback (e.g. tooltip or text change to "Copied!") after copying
- [ ] Style with a pointer cursor and subtle hover state to indicate clickability

## Acceptance Criteria

- Clicking the session ID copies it to the clipboard
- Clicking the file path copies it to the clipboard
- Brief visual feedback confirms the copy action
- Cursor and hover styling indicate the elements are interactive
