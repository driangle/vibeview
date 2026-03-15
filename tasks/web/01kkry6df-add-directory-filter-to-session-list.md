---
title: "Add directory filter to session list"
id: "01kkry6df"
status: completed
priority: high
type: feature
effort: small
tags: ["frontend", "ui"]
phase: "polish"
dependencies: ["01kkqx982"]
created: "2026-03-15"
---

# Add directory filter to session list

## Objective

Add the ability to filter the session list by directory (project path). Users should be able to select a directory to narrow down sessions to only those from that project.

## Tasks

- [x] Add a directory dropdown/selector populated from available projects in the session data
- [x] Filter displayed sessions when a directory is selected
- [x] Show an "All directories" option to clear the filter
- [x] Persist the selected filter in URL query params so it survives page reloads

## Acceptance Criteria

- A directory filter control is visible on the session list page
- Selecting a directory shows only sessions from that project
- An "All" option clears the filter and shows all sessions
- Filter state is reflected in the URL
