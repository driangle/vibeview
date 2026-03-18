---
title: "Make session table rows fully clickable"
id: "01kkzr8ry"
status: completed
priority: medium
type: feature
tags: ["ui", "ux"]
created: "2026-03-18"
---

# Make session table rows fully clickable

## Objective

Make the entire session table row clickable to navigate to the session view page. Currently only the session name link is clickable, which is a small target. Clicking anywhere on the row should navigate to `/session/:id`.

## Tasks

- [x] Add an `onClick` handler to the `<tr>` in `SessionRow` that navigates to the session view
- [x] Add `cursor-pointer` styling to rows
- [x] Ensure the directory filter button still works without triggering row navigation (stop propagation)
- [x] Preserve the existing session name link for accessibility (right-click, open in new tab)

## Acceptance Criteria

- Clicking anywhere on a session row navigates to that session's view page
- The directory filter button in the row still filters by directory without navigating
- Right-clicking the session name still allows "open in new tab"
- Rows show a pointer cursor on hover
