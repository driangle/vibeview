---
title: "Add persistent navigation bar"
id: "01kkry6en"
status: pending
priority: high
type: feature
effort: small
tags: ["frontend", "ui"]
phase: "polish"
dependencies: ["01kkqx8dr"]
created: "2026-03-15"
---

# Add persistent navigation bar

## Objective

Add a permanent top navigation bar that appears on all pages. Initially it should contain only a "Sessions" tab. This establishes the layout foundation for adding more navigation items later (e.g., Directories).

## Tasks

- [ ] Create a NavBar component with app title/logo and navigation links
- [ ] Add a "Sessions" link that navigates to the home page
- [ ] Highlight the active tab based on current route
- [ ] Integrate the NavBar into the app layout so it renders on all pages
- [ ] Ensure the session view page's back link integrates with the nav bar

## Acceptance Criteria

- A navigation bar is visible at the top of every page
- "Sessions" tab is present and links to the session list
- The active tab is visually highlighted
- Navigation bar does not interfere with page content or scrolling
