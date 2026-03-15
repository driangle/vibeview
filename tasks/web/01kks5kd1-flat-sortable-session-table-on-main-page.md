---
title: "Flat sortable session table on main page"
id: "01kks5kd1"
status: in-progress
priority: medium
type: feature
tags: ["ui"]
created: "2026-03-15"
---

# Flat sortable session table on main page

## Objective

Replace the directory-grouped session listing on the main page with a flat, sortable table showing all sessions. Sessions should be sorted by date (descending) by default, giving a unified view regardless of which directory they belong to.

## Tasks

- [ ] Remove the directory-based grouping logic from the main page
- [ ] Implement a flat table layout displaying all sessions
- [ ] Add sortable column headers (at minimum: date, session name/ID, directory)
- [ ] Default sort to date descending
- [ ] Ensure the directory is still visible as a column so context is not lost
- [ ] Make the directory value in each row clickable to filter the table by that directory (same behavior as the existing directory dropdown filter)

## Acceptance Criteria

- The main page shows all sessions in a single flat table, not grouped by directory
- The table is sorted by date (descending) by default
- Users can click column headers to re-sort by other fields
- The directory each session belongs to is still visible in the table
- Clicking a directory value in a row filters the table to show only sessions from that directory, consistent with the existing directory dropdown filter
