---
title: "Show pointer cursor on Previous/Next buttons in Session View"
id: "01kkzv61g"
status: pending
priority: low
type: bug
tags: ["ui"]
created: "2026-03-18"
---

# Show pointer cursor on Previous/Next buttons in Session View

## Steps to Reproduce

1. Open a session with multiple pages of messages
2. Hover over the "Previous" or "Next" pagination buttons

## Expected Behavior

The cursor should change to a pointer to indicate the buttons are clickable.

## Actual Behavior

The cursor remains as the default arrow.

## Fix

Add `cursor-pointer` class to the Previous/Next buttons in the Session View pagination component.
