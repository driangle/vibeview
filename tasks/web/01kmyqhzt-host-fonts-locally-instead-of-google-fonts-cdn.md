---
title: "Host fonts locally instead of Google Fonts CDN"
id: "01kmyqhzt"
status: pending
priority: low
type: chore
tags: ["web", "css", "fonts", "tailwind"]
created: "2026-03-30"
---

# Host fonts locally instead of Google Fonts CDN

## Objective

Replace external Google Fonts CDN imports with locally-hosted font files to eliminate the external network dependency, improve load performance, and enhance privacy.

Currently `apps/web/src/index.css` loads Inter, JetBrains Mono, Space Grotesk, and Material Symbols Outlined via `@import url('https://fonts.googleapis.com/...')`. The local font files already exist at `apps/web/public/fonts/` and `@font-face` declarations exist in `apps/web/src/fonts.css`, but integrating them breaks Tailwind v4's CSS processing.

## Context: Failed approaches

The `@tailwindcss/vite` plugin (v4.2.2) silently breaks all styles when the two external `@import url('https://...')` lines before `@import 'tailwindcss'` are removed. All of the following approaches were tested and failed:

1. `@import './fonts.css'` before `@import 'tailwindcss'`
2. `@import './fonts.css'` after `@import 'tailwindcss'`
3. `@import './fonts.css' layer(base)`
4. Inline `@font-face` declarations in index.css (between directives, at end of file, inside `@layer base`)
5. Importing `fonts.css` from `main.tsx` instead of index.css
6. `<link rel="stylesheet">` tag in `index.html` pointing to `public/fonts/fonts.css`
7. `@import url('/fonts/fonts.css')` (local URL with `url()` wrapper)

The external Google Fonts `@import url('https://...')` lines appear to be load-bearing for Tailwind v4's Vite plugin — even a minimal external import or removing just one of the two lines breaks styles.

## Tasks

- [ ] Investigate the `@tailwindcss/vite` plugin source or GitHub issues to understand why external `@import url()` lines before `@import 'tailwindcss'` are required
- [ ] Find a working approach to load local `@font-face` declarations without breaking Tailwind v4
- [ ] Remove the Google Fonts CDN `@import url()` lines from `index.css`
- [ ] Update font stacks in `@theme` with system font fallbacks
- [ ] Verify sidebar and all pages render correctly with local fonts
- [ ] Clean up unused `apps/web/src/fonts.css` if declarations move elsewhere

## Acceptance Criteria

- No external requests to `fonts.googleapis.com` or `fonts.gstatic.com`
- Inter, JetBrains Mono, and Material Symbols Outlined load from local `.woff2` files
- All pages render correctly — no broken layouts or missing icon fonts
- `make check` passes
