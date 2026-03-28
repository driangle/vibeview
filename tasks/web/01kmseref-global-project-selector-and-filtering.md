---
id: "01kmseref"
title: "Global project selector and filtering"
status: completed
priority: medium
effort: medium
dependencies: ["01kmserdz"]
tags: ["projects", "filtering", "ux"]
parent: "01kkrz4j6"
created: 2026-03-28
---

# Global project selector and filtering

## Objective

Add a global project selector to the navigation bar that filters all views (session list, stats/activity, directories) to the selected project's folders. The selection persists across page navigations and reloads. An "All" option shows unfiltered data as the default state.

## Tasks

- [ ] Add a project selector dropdown to the NavBar component
- [ ] Create a `ProjectFilterContext` (or extend existing patterns) to provide the active project globally
- [ ] Implement filtering logic that maps the active project's folder list to the existing `dir`/`project` filter
- [ ] Apply the global project filter to the session list page
- [ ] Apply the global project filter to the activity/stats page
- [ ] Apply the global project filter to the directories page
- [ ] Persist the selected project across page reloads (localStorage)
- [ ] Support an "All Projects" / no-filter default state
- [ ] Add tests for the filtering context and integration with existing pages

## Acceptance Criteria

- A project selector dropdown is visible in the navigation bar
- Selecting a project filters sessions on the home page to only those matching the project's folders
- The activity/stats page respects the active project filter
- The directories page respects the active project filter
- The selected project persists across page reloads
- An "All" option shows unfiltered data and is the default
- Changing the active project resets pagination to page 1
- The global filter composes with existing per-page filters (model, date range, search)
