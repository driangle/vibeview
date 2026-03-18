---
title: "Persist session table filters in local storage"
id: "01kkzr65x"
status: completed
priority: medium
type: feature
tags: ["ui", "persistence"]
created: "2026-03-18"
---

# Persist session table filters in local storage

## Objective

Remember the user's session table filter selections (directory, date range, search query, sort column/direction) across page visits by persisting them in local storage. When the user returns to the session list, the filters should be restored to their last state instead of resetting to defaults.

## Tasks

- [x] Store directory filter (`dir`) selection in local storage via `useLocalStorage` hook
- [x] Store date range filter (`from`/`to`) selection in local storage
- [x] Store search query in local storage
- [x] Store sort column and sort direction in local storage
- [x] Sync local storage values with URL search params (URL params take precedence when present)
- [x] Ensure clearing a filter also clears it from local storage

## Acceptance Criteria

- Selecting a directory filter, refreshing the page, and returning shows the same directory selected
- Date range, search, and sort preferences persist across page reloads
- URL params override stored values (sharing a filtered URL works correctly)
- Clearing all filters resets local storage to defaults
