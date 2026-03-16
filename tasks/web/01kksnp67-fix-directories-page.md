---
title: "Fix broken directories page"
id: "01kksnp67"
status: completed
priority: high
type: bug
tags: ["ui", "directories"]
created: "2026-03-15"
---

# Fix broken directories page

## Steps to Reproduce

1. Navigate to `/directories` in the web app
2. Observe the page is broken (needs investigation to determine exact failure mode)

## Expected Behavior

The directories page should display a list of all unique project directories with session counts, last activity timestamps, and clickable links to filter the session list by that directory.

## Actual Behavior

The page is broken. Needs investigation — possible causes include:
- The `/api/sessions` fetch failing or returning unexpected data when no filters are applied
- The in-memory `summarizeDirectories()` grouping failing on edge cases (e.g. sessions with empty/null project paths)
- Rendering errors in the directory list component
- Substring matching in the API causing incorrect filtering when navigating from a directory to its sessions

## Tasks

- [x] Reproduce the issue and identify the root cause
- [x] Fix the underlying bug
- [ ] Verify the directories page loads and displays all directories correctly
- [ ] Verify clicking a directory navigates to the session list filtered to that directory

## Acceptance Criteria

- The `/directories` page loads without errors
- All unique project directories are listed with correct session counts and last activity times
- Clicking a directory navigates to the session list filtered to that directory's sessions
