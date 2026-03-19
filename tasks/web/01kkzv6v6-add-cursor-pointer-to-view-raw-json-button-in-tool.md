---
title: "Add cursor pointer to View raw JSON button in tool panel"
id: "01kkzv6v6"
status: completed
priority: low
type: bug
tags: ["ui"]
created: "2026-03-18"
---

# Add cursor pointer to View raw JSON button in tool panel

## Steps to Reproduce

1. Open a session containing tool use messages
2. Hover over the "View raw JSON" button in a tool panel

## Expected Behavior

The cursor should change to a pointer to indicate the button is clickable.

## Actual Behavior

The cursor remains as the default arrow.

## Fix

Add `cursor-pointer` class to the "View raw JSON" button in the tool panel component.
