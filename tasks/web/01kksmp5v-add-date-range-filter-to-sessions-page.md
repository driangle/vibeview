---
title: "Add date range filter to sessions page"
id: "01kksmp5v"
status: in-progress
priority: medium
type: feature
tags: ["ui", "filtering"]
created: "2026-03-15"
---

# Add date range filter to sessions page

## Objective

Add a date range filter to the sessions list page so users can narrow down sessions to a specific time period. The filter should allow selecting preset ranges (today, last 7 days, last 30 days) as well as a custom date range, and pass the selected range as query parameters to the `/api/sessions` endpoint.

## Tasks

- [ ] Add `from` and `to` query parameters to the `/api/sessions` API endpoint to filter sessions by timestamp
- [ ] Create a `DateRangeFilter` component with preset options (today, last 7 days, last 30 days, all time) and a custom range picker
- [ ] Integrate the filter into `SessionList.tsx` alongside the existing search and directory filters
- [ ] Pass selected date range as `from`/`to` params in the SWR fetch URL
- [ ] Reset pagination to page 1 when the date range changes
- [ ] Persist the selected date range in URL search params so it survives page refreshes

## Acceptance Criteria

- Users can filter sessions by preset date ranges (today, last 7 days, last 30 days, all time)
- Users can select a custom start and end date to filter sessions
- The session list updates to show only sessions within the selected date range
- Changing the date range resets pagination to page 1
- The selected date range is reflected in the URL and restored on page load
- The default state shows all sessions (no date filter applied)
