---
id: "01km32n1x"
title: "Backend settings API and persistence"
status: completed
priority: medium
effort: medium
type: feature
parent: "01kkzsea9"
dependencies: []
tags: ["settings", "api", "backend"]
created: 2026-03-19
---

# Backend settings API and persistence

## Objective

Add a settings subsystem to the Go backend: a JSON schema for all 10 configurable options, file-based persistence at `~/.config/vibeview/settings.json`, and `GET /PUT /api/settings` endpoints with validation.

## Settings Schema

```json
{
  "theme": "system",
  "defaultSort": { "column": "date", "direction": "desc" },
  "pageSize": 100,
  "dateFormat": "relative",
  "autoFollow": false,
  "refreshInterval": 5000,
  "showCost": true,
  "customModelPricing": {},
  "messagesPerPage": 100,
  "recentThreshold": 300000
}
```

## Tasks

- [x] Define `Settings` struct with JSON tags and defaults
- [x] Add settings file path (`~/.config/vibeview/settings.json`)
- [x] Implement `LoadSettings()` — read from file, fall back to defaults if missing
- [x] Implement `SaveSettings()` — validate and write to file (create parent dirs if needed)
- [x] Add validation (e.g. pageSize 25-500, refreshInterval 1000-60000, theme enum, sort column enum)
- [x] Add `GET /api/settings` handler — returns current settings
- [x] Add `PUT /api/settings` handler — validates, saves, returns updated settings
- [x] Return clear error messages for invalid settings (400 + JSON error body)

## Acceptance Criteria

- `GET /api/settings` returns all settings with defaults when no file exists
- `PUT /api/settings` persists to `~/.config/vibeview/settings.json`
- Invalid values (e.g. `pageSize: -1`, `theme: "neon"`) return 400 with descriptive errors
- Settings file is created with parent directories if it doesn't exist
- Partial updates merge with existing settings (not replace the whole file)
