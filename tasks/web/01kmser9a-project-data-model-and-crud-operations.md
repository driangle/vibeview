---
id: "01kmser9a"
title: "Project data model and CRUD operations"
status: completed
priority: medium
effort: medium
dependencies: []
tags: ["projects", "data-model"]
parent: "01kkrz4j6"
created: 2026-03-28
---

# Project data model and CRUD operations

## Objective

Define the project data model and implement CRUD operations for managing projects. Projects are stored client-side (localStorage) and consist of a name, a list of folder paths, and optional metadata (description, color). This task provides the data foundation that the UI and filtering tasks build on.

## Tasks

- [x] Define the `Project` TypeScript interface (id, name, folderPaths, description?, color?)
- [x] Create a `useProjects` hook that manages project state in localStorage
- [x] Implement create, read, update, and delete operations in the hook
- [x] Generate unique IDs for new projects (e.g., crypto.randomUUID or nanoid)
- [x] Add tests for CRUD operations and localStorage persistence

## Acceptance Criteria

- A `Project` type exists with: id, name, folderPaths (string[]), optional description and color
- `useProjects()` hook provides: projects list, createProject, updateProject, deleteProject
- Projects persist across page reloads via localStorage
- Creating a project with a duplicate name is prevented or handled gracefully
- CRUD operations are covered by tests
