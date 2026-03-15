---
title: "Embed SPA into Go binary and add browser open"
id: "01kkqxckt"
status: completed
priority: high
effort: small
type: chore
tags: ["backend", "build"]
phase: "polish"
dependencies: ["01kkqx60d", "01kkqx8dr"]
created: "2026-03-15"
---

# Embed SPA into Go binary and add browser open

## Objective

Use Go's `embed` package to embed the built React SPA into the Go binary, serve it as the default route, and implement the `--open` flag to auto-open the browser on startup.

## Tasks

- [x] Add build step to compile the React SPA (`npm run build` in `web/`)
- [x] Use `//go:embed` directive to embed `web/dist/` into the Go binary
- [x] Serve embedded SPA files for all non-`/api` routes
- [x] Handle SPA client-side routing (serve index.html for all non-asset, non-API paths)
- [x] Implement `--open` flag: open default browser to `http://localhost:{port}` on startup
- [x] Add a Makefile or build script that runs frontend build then Go build
- [x] Verify single binary works end-to-end without external files

## Acceptance Criteria

- `go build` (after frontend build) produces a single binary with embedded SPA
- Running the binary serves both the API and the SPA
- Client-side routes (e.g., `/session/abc`) work correctly (no 404)
- `--open` flag opens the browser on startup
- `--open=false` skips browser open
