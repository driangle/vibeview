---
title: "Build session list page"
id: "01kkqx982"
status: completed
priority: high
effort: medium
type: feature
tags: ["frontend", "ui"]
phase: "core"
dependencies: ["01kkqx8dr", "01kkqx60d"]
created: "2026-03-15"
---

# Build session list page

## Objective

Implement the session list page at `/` that displays all sessions grouped by project. Fetches data from the backend API using SWR with periodic revalidation for auto-updates.

## Tasks

- [x] Define TypeScript types for session list API response
- [x] Create SWR hook for fetching sessions from `GET /api/sessions`
- [x] Build session card component showing: project name, slug/display text, timestamp, model, message count
- [x] Group sessions by project path
- [x] Add search/filter input for filtering by project name
- [x] Implement click-to-navigate to `/session/:id`
- [x] Configure SWR periodic revalidation (every 5s) for auto-updates
- [x] Add visual indicator for "live" sessions (recently updated)
- [x] Style with Tailwind CSS

## Acceptance Criteria

- Sessions load and display on page visit
- Sessions are grouped by project
- Search input filters sessions by project name
- Clicking a session navigates to the session view
- New sessions appear automatically within 5s via SWR revalidation
- Responsive layout that works on desktop screens
