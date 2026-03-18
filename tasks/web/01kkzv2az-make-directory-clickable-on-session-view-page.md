---
title: "Make directory clickable on Session View page"
id: "01kkzv2az"
status: completed
priority: medium
type: feature
tags: ["ui"]
created: "2026-03-18"
---

# Make directory clickable on Session View page

## Objective

Make the directory name in the Session View header clickable so it navigates back to the session list filtered by that directory, matching the click-to-filter behavior already present in the session table rows.

## Tasks

- [x] Replace the plain `<span>` for `projectName(session.project)` in `SessionView.tsx` header with a `<Link>` to `/?dir=<project>`
- [x] Style consistently with the directory button in `SessionRow` (hover underline, blue hover color)

## Acceptance Criteria

- Clicking the directory name in the session view header navigates to `/?dir=<project>`
- The session list shows only sessions from that directory
- Hover state shows underline and blue text color
