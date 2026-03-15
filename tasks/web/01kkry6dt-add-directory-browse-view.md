---
title: "Add directory browse view"
id: "01kkry6dt"
status: pending
priority: medium
type: feature
effort: medium
tags: ["frontend", "ui"]
phase: "polish"
dependencies: ["01kkry6en", "01kkry6df"]
created: "2026-03-15"
---

# Add directory browse view

## Objective

Add a "By Directory" view that lists all project directories first, then allows the user to drill down into a directory to see its sessions. This provides a project-centric navigation flow.

## Tasks

- [ ] Create a directory listing page/view showing all unique project directories with session counts
- [ ] Show relevant metadata per directory (session count, most recent activity)
- [ ] Make each directory clickable to navigate to a filtered session list for that directory
- [ ] Add a "Directories" tab/link to the navigation bar
- [ ] Ensure back-navigation works correctly from directory > sessions > session detail

## Acceptance Criteria

- A directory listing view shows all project directories
- Each directory shows session count and last activity time
- Clicking a directory drills down into that directory's sessions
- Navigation between directory view, session list, and session detail is seamless
