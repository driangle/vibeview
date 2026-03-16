---
title: "Add dark mode support with toggle"
id: "01kksn7dz"
status: completed
priority: low
type: feature
tags: ["ui", "theming"]
created: "2026-03-15"
---

# Add dark mode support with toggle

## Objective

Add dark mode support to the web app with a simple toggle button in the top-right corner of the page. The theme preference should persist across sessions via localStorage and respect the user's OS-level preference as the default.

## Tasks

- [x] Define dark mode CSS variables (background, text, borders, accents) alongside existing light theme values
- [x] Add a theme toggle button (sun/moon icon) to the top-right of the page header/layout
- [x] Implement theme state management — toggle between light/dark and persist choice in localStorage
- [x] Default to the user's OS preference via `prefers-color-scheme` media query when no saved preference exists
- [x] Apply dark mode styles to all existing components (session table, pagination, filters, badges)
- [x] Prevent flash of wrong theme on page load (read preference before render)

## Acceptance Criteria

- A toggle button is visible in the top-right corner of the page
- Clicking the toggle switches between light and dark themes
- The selected theme persists across page reloads via localStorage
- When no preference is saved, the app defaults to the user's OS color scheme preference
- All existing UI components render correctly in both light and dark modes
- No flash of incorrect theme on initial page load
