---
title: "Add model filter dropdown and clickable model names"
id: "01kkzr9tc"
status: pending
priority: medium
type: feature
tags: ["ui", "filtering"]
created: "2026-03-18"
---

# Add model filter dropdown and clickable model names

## Objective

Allow users to filter sessions by model in two ways: a new dropdown in the filter controls bar (alongside directory and date range), and by clicking any model name badge anywhere in the interface (session table rows, session view page, etc.) to activate that model filter.

## Tasks

- [ ] Add a model filter dropdown to the session list filter controls, populated from unique models across sessions
- [ ] Add `model` as a URL search param and wire it into the session filtering logic
- [ ] Make model name badges in `SessionRow` clickable to set the model filter
- [ ] Make model name badges in `SessionView` and any other pages clickable to navigate back to the session list filtered by that model
- [ ] Extract a reusable `ModelBadge` component that handles the click-to-filter behavior
- [ ] Style the model dropdown consistently with the directory dropdown (fixed width to avoid flicker)

## Acceptance Criteria

- A model dropdown appears in the filter controls with an "All models" default option
- Selecting a model from the dropdown filters the session list to only sessions using that model
- Clicking a model badge in the session table activates the model filter
- Clicking a model badge on the session view page navigates to the session list filtered by that model
- The model filter is reflected in the URL as a search param
- Clearing the filter shows all sessions again
