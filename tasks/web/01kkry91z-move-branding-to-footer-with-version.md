---
title: "Move branding to footer with version"
id: "01kkry91z"
status: completed
priority: medium
type: feature
effort: small
tags: ["frontend", "ui"]
phase: "polish"
dependencies: ["01kkry6en"]
created: "2026-03-15"
---

# Move branding to footer with version

## Objective

The "vibeview" branding currently appears in the header area of pages. It should be removed from the header and instead appear only in a footer at the bottom of every page, alongside the app version number.

## Tasks

- [ ] Remove "vibeview" text from the page header/top area
- [ ] Create a Footer component that displays "vibeview" and the version number
- [ ] Add the Footer to the app layout so it renders on all pages
- [ ] Expose the version number (from Go binary or package.json) to the frontend

## Acceptance Criteria

- "vibeview" text no longer appears in the header
- A footer is visible at the bottom of every page showing "vibeview" and version
- Footer styling is subtle and unobtrusive
