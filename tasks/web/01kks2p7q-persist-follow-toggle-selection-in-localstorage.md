---
title: "Persist Follow toggle selection in LocalStorage"
id: "01kks2p7q"
status: pending
priority: medium
type: feature
tags: ["ui", "persistence"]
created: "2026-03-15"
---

# Persist Follow toggle selection in LocalStorage

## Objective

Persist the "Follow" toggle state in `localStorage` so the user's preference survives page reloads and navigation. Currently, `followMode` in `SessionView.tsx` defaults to `true` on every mount.

## Tasks

- [ ] Read initial `followMode` value from `localStorage` (fallback to `true`)
- [ ] Write to `localStorage` whenever the user explicitly toggles follow mode via the `FollowToggle` button
- [ ] Ensure scroll-based auto-enable/disable does NOT persist (only explicit user toggles)

## Acceptance Criteria

- Toggling "Follow" off and refreshing the page keeps follow mode off
- Toggling "Follow" on and refreshing the page keeps follow mode on
- Scroll-based follow changes are not written to localStorage
