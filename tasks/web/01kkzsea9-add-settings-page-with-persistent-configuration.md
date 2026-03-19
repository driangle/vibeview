---
title: "Add settings page with persistent configuration"
id: "01kkzsea9"
status: in-progress
priority: medium
type: feature
tags: ["settings", "ui", "config"]
created: "2026-03-18"
---

# Add settings page with persistent configuration

## Objective

Add a dedicated Settings page to the web UI where users can configure various aspects of VibeView. Settings should be persisted to a file on disk (via a new backend API) so they survive browser clears and work across devices hitting the same server. The first step is to audit the codebase for configurable behaviors and surface the most useful ones as settings.

## Discovery

Before implementing, identify candidate settings by reviewing existing hardcoded values and user-facing behaviors. Likely candidates include:

- **Theme** — already stored in localStorage; migrate to persistent settings
- **Default sort column/direction** for the session list
- **Default page size** for pagination
- **Date format** — relative ("2 hours ago") vs absolute ("2026-03-18 14:30")
- **Session list density** — compact vs normal
- **Auto-follow behavior** in session view (on/off by default)
- **Cost display** — show/hide, currency
- **Custom model pricing** overrides (currently hardcoded)
- **Watch directories** — additional directories beyond `~/.claude`
- **Session age filter** — only show sessions from the last N days

Not all of these need to ship in v1. Pick the most impactful subset.

## Tasks

- [ ] Design a settings schema (JSON) covering the initial set of configurable options
- [ ] Add a backend settings file path (e.g. `~/.config/vibeview/settings.json`)
- [ ] Add `GET /api/settings` and `PUT /api/settings` endpoints in the Go server
- [ ] Create a `/settings` route in the React app with a form-based UI
- [ ] Add a nav link to the Settings page in the NavBar
- [ ] Wire settings values into the app (replace hardcoded defaults / localStorage values)
- [ ] Fall back gracefully when the settings file doesn't exist (use defaults)
- [ ] Validate settings on the backend before writing

## Sub-tasks

- `01km32n1x` — Backend settings API and persistence (schema, file I/O, GET/PUT endpoints, validation)
- `01km32n4d` — Settings page UI and navigation (route, form controls, nav link)
- `01km32n7d` — Wire settings into app components (replace hardcoded defaults with settings values)

## Acceptance Criteria

- A Settings page is accessible from the main navigation
- Users can view and modify at least 3 distinct settings
- Settings persist across server restarts (stored on disk, not just localStorage)
- The app works correctly with no settings file present (sensible defaults)
- `GET /api/settings` returns current settings; `PUT /api/settings` updates them
- Invalid settings are rejected with a clear error message
