---
id: "01km32n4d"
title: "Settings page UI and navigation"
status: pending
priority: medium
effort: medium
type: feature
parent: "01kkzsea9"
dependencies: ["01km32n1x"]
tags: ["settings", "ui", "frontend"]
created: 2026-03-19
---

# Settings page UI and navigation

## Objective

Create a `/settings` route in the React app with a form-based UI for viewing and modifying all 10 settings. Add a nav link in the NavBar. The page should fetch settings from `GET /api/settings` and save via `PUT /api/settings`.

## Tasks

- [ ] Add `/settings` route in the React router
- [ ] Add Settings nav link to the NavBar component
- [ ] Create `SettingsPage` component with form controls for all settings:
  - Theme: radio group (Light / Dark / System)
  - Default sort column: dropdown (date, name, directory, messages, tokens, cost)
  - Default sort direction: toggle (asc / desc)
  - Page size: number input (25-500)
  - Date format: radio group (Relative / Absolute)
  - Auto-follow default: toggle switch
  - Refresh interval: number input or dropdown (2s, 5s, 10s, 30s)
  - Show cost column: toggle switch
  - Custom model pricing: editable key-value pairs (model name -> price per M tokens input/output)
  - Messages per page: number input (25-500)
- [ ] Fetch current settings on mount via `GET /api/settings`
- [ ] Save on form submission via `PUT /api/settings` with success/error feedback
- [ ] Show loading state while fetching, error state on failure

## Acceptance Criteria

- Settings page is accessible at `/settings` and from the NavBar
- All 10 settings are displayed with appropriate form controls
- Saving shows success feedback; invalid values show error messages from the API
- Page loads correctly even when no settings file exists (shows defaults)
