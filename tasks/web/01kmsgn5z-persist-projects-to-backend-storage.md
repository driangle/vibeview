---
title: "Persist projects to backend storage"
id: "01kmsgn5z"
status: pending
priority: medium
type: feature
effort: medium
tags: ["projects", "persistence"]
dependencies: ["01kmserdz"]
created: "2026-03-28"
---

# Persist projects to backend storage

## Objective

Move project storage from browser localStorage to a backend JSON file so that projects survive clearing browser data. Follow the same pattern used by settings (`internal/settings`): a JSON file on disk with GET/PUT API endpoints, and update the frontend `useProjects` hook to use `fetch` instead of `useLocalStorage`.

## Tasks

- [ ] Add a `projects.json` file-based store in the Go backend (similar to `internal/settings`)
- [ ] Add `GET /api/projects` and `PUT /api/projects` endpoints to the server
- [ ] Update `useProjects` hook to fetch/save via the API instead of localStorage
- [ ] Migrate existing localStorage projects to the backend on first load (one-time migration)
- [ ] Add backend tests for the new endpoints
- [ ] Update frontend tests for the changed hook behavior

## Acceptance Criteria

- Projects persist across browser data clears (stored server-side in a JSON file)
- Existing projects in localStorage are migrated to the backend automatically
- The API follows the same pattern as `/api/settings` (GET to read, PUT to write)
- All existing project UI functionality continues to work unchanged
- Backend and frontend tests pass
