---
title: "Host Google Fonts locally with system font fallbacks"
id: "01kmxkreg"
status: pending
priority: high
type: feature
tags: ["networking", "offline", "fonts"]
created: "2026-03-29"
---

# Host Google Fonts locally with system font fallbacks

## Objective

Remove external Google Fonts CDN dependency so the app works fully offline. Currently `apps/web/src/index.css` imports Inter, JetBrains Mono, Space Grotesk, and Material Symbols Outlined from `fonts.googleapis.com`, which fails without internet access and leaks usage data to Google.

## Tasks

- [ ] Download and bundle Inter, JetBrains Mono, and Space Grotesk font files (woff2) into `apps/web/public/fonts/`
- [ ] Create local `@font-face` declarations to replace the Google Fonts `@import` statements
- [ ] Bundle Material Symbols Outlined locally or replace with a bundled icon solution
- [ ] Remove the two `@import` lines from `apps/web/src/index.css`
- [ ] Add system font fallback stacks to all `font-family` declarations:
  - Body: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`
  - Mono: `"SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace`
- [ ] Verify the app renders acceptably with only system fonts (disable custom fonts to test)

## Acceptance Criteria

- No requests to `fonts.googleapis.com` or any external CDN at runtime
- App renders with correct fonts when custom fonts are available
- App renders with readable system fonts when custom fonts fail to load
- Icons display correctly using the bundled solution
- No visual regressions in light and dark themes
