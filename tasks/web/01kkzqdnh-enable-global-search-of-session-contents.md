---
title: "Enable global search of session contents"
id: "01kkzqdnh"
status: pending
priority: medium
type: feature
tags: []
created: "2026-03-18"
---

# Enable global search of session contents

## Objective

Allow users to search across all sessions by querying session contents (conversation messages, tool calls, etc.). Currently, users can only browse sessions individually — this feature adds a global search bar that finds sessions matching a text query, making it easy to locate past conversations.

## Tasks

- [ ] Add a search input to the sessions list / header area
- [ ] Implement backend/API endpoint that searches session contents for a query string
- [ ] Return matching sessions with relevant snippets / highlighted matches
- [ ] Display search results with session metadata (name, date) and matching excerpts
- [ ] Support incremental / debounced search as the user types
- [ ] Handle empty results state with helpful messaging

## Acceptance Criteria

- Users can type a query and see sessions whose contents match the search term
- Search covers message text within sessions (both user and assistant messages)
- Results show which session matched and a snippet of the matching content
- Search is performant and responsive (debounced input, reasonable latency)
- Empty and error states are handled gracefully
