---
title: "Move session search to server side"
id: "01kkry6g9"
status: pending
priority: medium
type: feature
effort: medium
tags: ["frontend", "backend", "performance"]
phase: "polish"
dependencies: ["01kkqx60d", "01kkqx982"]
created: "2026-03-15"
---

# Move session search to server side

## Objective

The session search/filter is currently implemented client-side, filtering the full session list in the browser. This should be moved to the server to handle larger numbers of sessions efficiently and reduce data transfer.

## Tasks

- [ ] Add a `q` (or `search`) query parameter to the `GET /api/sessions` endpoint
- [ ] Implement server-side filtering by project path, slug, and display name
- [ ] Update the frontend to send search queries to the API instead of filtering locally
- [ ] Add debouncing to the search input to avoid excessive API calls
- [ ] Remove client-side filtering logic from SessionList

## Acceptance Criteria

- Search queries are sent to the server via query parameter
- Server filters sessions by project, slug, and display name (case-insensitive)
- Frontend search input is debounced (300ms or similar)
- Results update correctly as the user types
- Performance is acceptable with large session counts
