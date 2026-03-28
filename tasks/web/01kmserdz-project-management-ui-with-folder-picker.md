---
id: "01kmserdz"
title: "Project management UI with folder picker"
status: pending
priority: medium
effort: medium
dependencies: ["01kmser9a"]
tags: ["projects", "ui"]
parent: "01kkrz4j6"
created: 2026-03-28
---

# Project management UI with folder picker

## Objective

Build the UI for creating and editing projects. Users should be able to name a project, select folders from the list of known directories (sourced from existing sessions), and save/edit/delete projects. This provides the user-facing management layer on top of the data model.

## Tasks

- [ ] Build a project creation/edit dialog component
- [ ] Add a folder picker that shows available directories (from session data)
- [ ] Support selecting multiple folders in the picker
- [ ] Wire the dialog to `useProjects` hook for create/update operations
- [ ] Add a project list view (e.g., in Settings or a dedicated section) showing all projects with edit/delete actions
- [ ] Add confirmation dialog for project deletion
- [ ] Add tests for the project management UI components

## Acceptance Criteria

- Users can open a dialog to create a new project with a name and selected folders
- The folder picker shows all known directories from existing sessions
- Users can select/deselect multiple folders
- Users can edit an existing project's name and folder selection
- Users can delete a project with a confirmation step
- The UI is accessible and follows existing design patterns (Tailwind, consistent styling)
