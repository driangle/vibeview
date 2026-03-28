---
title: "Global project selector with cross-page filtering"
id: "01kmsgr56"
status: completed
priority: high
type: feature
effort: large
tags: ["projects", "ui", "filtering"]
dependencies: ["01kmserdz"]
created: "2026-03-28"
---

# Global project selector with cross-page filtering

## Objective

Add a global project selector (e.g., in the NavBar) that stores the active project ID in a URL param (`?project=<id>`). When a project is selected, ALL pages automatically filter to only show sessions whose working directory matches one of the project's `folderPaths`. This replaces the current per-page `dir` filter with a unified project-level filter.

## Current State

- **SessionList** filters by a single `dir` URL param (one directory path) via `useSessionFilters`
- **UsagePatterns/Activity** has its own isolated `project` state (single directory, not connected to global state)
- **DirectoryList** has no filtering
- There is no concept of an "active project" that maps a Project (with multiple `folderPaths`) to a global filter

## Tasks

- [x] Add a project selector dropdown to the NavBar (shows all projects, plus "All" option)
- [x] Store active project ID in a URL param (`?project=<id>`) that persists across navigation
- [x] Create a shared hook (e.g., `useActiveProject`) that reads the URL param, resolves the Project, and returns its `folderPaths`
- [x] Update SessionList to use the active project filter (replace or augment the `dir` dropdown)
- [x] Update UsagePatterns/Activity page to respect the global project filter instead of its own local state
- [x] Update DirectoryList to filter directories by active project's `folderPaths`
- [x] Update the backend `/api/sessions` and `/api/activity` endpoints to support project-based filtering via `?project=<id>`
- [x] Ensure the `dir` filter still works as a secondary filter within a project
- [x] Add tests for the global project filter behavior

## Acceptance Criteria

- A project selector is visible in the NavBar on all pages
- Selecting a project stores `?project=<id>` in the URL (shareable/bookmarkable)
- SessionList only shows sessions from the selected project's directories
- Activity/UsagePatterns only shows data from the selected project's directories
- DirectoryList only shows directories belonging to the selected project
- Selecting "All" clears the filter and shows everything
- The active project persists across page navigation
- Existing `dir` filter can still narrow within a selected project
