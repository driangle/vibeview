---
title: "Show empty state message when no sessions found"
id: "01kkzr787"
status: pending
priority: low
type: feature
tags: ["ui"]
created: "2026-03-18"
---

# Show empty state message when no sessions found

## Objective

Display a helpful empty state message below the session table when there are no sessions to show. Currently the table just renders with headers and no rows, which looks broken. The empty state should distinguish between "no sessions exist at all" and "no sessions match your current filters."

## Tasks

- [ ] Add an empty state message below the `SessionTable` when `sortedSessions` is empty and data has loaded
- [ ] Show different messages for "no sessions found" vs "no sessions match your filter"
- [ ] Style the empty state consistently with the rest of the page

## Acceptance Criteria

- When no sessions exist, a message like "No sessions found" appears below the table headers
- When filters are active but no sessions match, a message like "No sessions match your filters" appears
- The table headers remain visible in both cases
- The message is visually centered and styled consistently
