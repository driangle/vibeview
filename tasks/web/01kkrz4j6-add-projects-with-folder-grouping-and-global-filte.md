---
title: "Add projects with folder grouping and global filter"
id: "01kkrz4j6"
status: pending
priority: medium
type: feature
tags: ["projects", "filtering", "ux"]
created: "2026-03-15"
---

# Add projects with folder grouping and global filter

## Objective

Allow users to create "projects" by selecting a set of folders that belong together. A project acts as a global filter — once a project is selected, all views (session list, stats, and any other pages) are scoped to sessions matching that project's folders. This gives users an organized way to focus on the work that matters to them.

## Tasks

- [ ] Design the project data model (name, list of folder paths, optional description/color)
- [ ] Build project CRUD — create, edit, rename, and delete projects
- [ ] Build a project creation/edit UI with a folder picker for selecting directories
- [ ] Add a global project selector (e.g., dropdown in the nav bar) that persists across page navigations
- [ ] Implement filtering logic so the active project scopes sessions by its folder list
- [ ] Apply the global project filter to the session list page
- [ ] Apply the global project filter to stats and any other data-driven pages
- [ ] Persist the selected project across page reloads (e.g., URL param or local storage)
- [ ] Support an "All Projects" / no-filter default state

## Sub-tasks

1. **01kmser9a** — [Project data model and CRUD operations](01kmser9a-project-data-model-and-crud-operations.md)
2. **01kmserdz** — [Project management UI with folder picker](01kmserdz-project-management-ui-with-folder-picker.md) (depends on 01kmser9a)
3. **01kmseref** — [Global project selector and filtering](01kmseref-global-project-selector-and-filtering.md) (depends on 01kmserdz)

## Acceptance Criteria

- Users can create a project by giving it a name and selecting one or more folders
- Users can edit and delete existing projects
- A global project selector is visible in the navigation and persists across pages
- Selecting a project filters sessions to only those matching the project's folders
- Stats and other pages respect the active project filter
- The selected project persists across page reloads
- An "All" option shows unfiltered data (default state)
