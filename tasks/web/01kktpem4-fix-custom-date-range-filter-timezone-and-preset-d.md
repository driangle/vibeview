---
title: "Fix custom date range filter timezone and preset detection bugs"
id: "01kktpem4"
status: pending
priority: low
type: bug
tags: ["ui", "filters"]
created: "2026-03-16"
---

# Fix custom date range filter timezone and preset detection bugs

## Objective

Fix two bugs in the date range filter component (`DateRangeFilter.tsx`) that affect custom date range selection.

## Steps to Reproduce

1. Set browser timezone to any non-UTC timezone (e.g., Europe/Berlin UTC+1)
2. Open the sessions page and select "Today" preset in the date range filter
3. Switch to "Custom" mode — the date inputs show yesterday's date instead of today's
4. Additionally, after a page refresh, preset buttons may show "Custom" instead of the correct preset label

## Expected Behavior

- Date inputs should display the correct local date regardless of timezone
- Preset detection should reliably identify matching presets after page refresh

## Actual Behavior

- `msToDateInput()` uses `toISOString()` which converts to UTC, causing off-by-one date display for non-UTC users
- `derivePreset()` uses exact millisecond equality which can fail if timestamps are recalculated at slightly different times

## Tasks

- [ ] Fix `msToDateInput()` in `DateRangeFilter.tsx` to use local date (e.g., manual `getFullYear()`/`getMonth()`/`getDate()` formatting) instead of `toISOString()`
- [ ] Update `derivePreset()` to use a small tolerance window instead of exact equality for timestamp comparison
- [ ] Add tests for date range filter timezone handling

## Acceptance Criteria

- Date inputs display the correct local date when switching from a preset to custom mode
- Preset labels are correctly detected after page refresh
- Filter works correctly for users in non-UTC timezones
