---
title: "Deduplicate session rows on home page"
id: "01kkry619"
status: completed
priority: high
type: bug
effort: small
tags: ["frontend", "ui"]
phase: "polish"
dependencies: ["01kkqx982"]
created: "2026-03-15"
---

# Deduplicate session rows on home page

## Objective

The session list on the home page currently shows multiple rows for the same session (one per message or update). It should display only one row per unique session ID, showing the most recent data for that session.

## Tasks

- [x] Investigate whether duplication originates from the backend API or frontend rendering
- [x] If backend: deduplicate sessions by ID in the API response, keeping the latest entry
- [ ] ~~If frontend: deduplicate the session array by ID before rendering~~ (N/A — fixed in backend)
- [x] Verify that the displayed row uses the latest timestamp, message count, and slug

## Acceptance Criteria

- Each session appears exactly once in the session list
- The displayed row reflects the most recent data for that session (latest timestamp, message count, model)
- No visual regressions in the session list layout
