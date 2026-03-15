---
title: "Paginate sessions on home page — show top 100 with pagination"
id: "01kkskr2k"
status: completed
priority: medium
type: feature
tags: []
created: "2026-03-15"
---

# Paginate sessions on home page — show top 100 with pagination

## Objective

The home page currently loads and displays all sessions at once, which will degrade performance as the number of sessions grows. Limit the initial view to the top 100 sessions and add pagination so users can navigate through older sessions.

## Tasks

- [x] Add pagination support to the sessions API endpoint (limit/offset or cursor-based)
- [x] Update the home page to fetch only the first 100 sessions on initial load
- [x] Add pagination controls (next/previous or page numbers) to the sessions table
- [x] Show total session count so users know how many pages exist
- [x] Handle edge cases: empty state, last page with fewer than 100 results

## Acceptance Criteria

- Home page loads at most 100 sessions on initial render
- Users can navigate to subsequent pages to view older sessions
- Total session count is visible to the user
- Pagination state is preserved in the URL (query params) so links are shareable
