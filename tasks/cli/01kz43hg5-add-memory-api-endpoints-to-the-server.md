---
id: "01kz43hg5"
title: "Add memory API endpoints to the server"
status: pending
priority: high
effort: small
type: feature
phase: memory-explorer
dependencies: ["01kz43h5k"]
tags: [cli, server, memory-explorer]
context: ["apps/cli/internal/server/server.go", "apps/lib/memory"]
created_at: 2026-08-03
verify:
  - type: bash
    run: "cd apps/cli && go build ./... && go test ./..."
---

# Add memory API endpoints to the server

## Objective

Expose the `apps/lib/memory` package over HTTP so the web UI can render Claude's
memory. The server does the reading and serializing; the frontend stays a thin
display layer.

## Context / Findings

- Routes are registered in `Server.routes()` at `apps/cli/internal/server/server.go`
  using Go 1.22 method patterns, e.g. `mux.HandleFunc("GET /api/activity", ...)`.
  Existing endpoints: `/api/config`, `/api/health`, `/api/settings`, `/api/projects`,
  `/api/sessions`, `/api/sessions/{id}`, `/api/sessions/{id}/stream`, `/api/activity`,
  `/api/search`. Add the memory routes here.
- The server already holds the resolved `claudeDir`; pass it into
  `memory.Discover(claudeDir)`.
- Response/serialization helpers follow the existing pattern extracted in
  `apps/cli/internal/server` — reuse the shared JSON response helper.
- Non-`/api/` paths fall through to the embedded SPA, so new pages need no server
  route beyond the API.

## Tasks

- [ ] `GET /api/memory` — return the discovered memory across all projects: a list of
      projects (decoded path + entry count + type breakdown) plus the global
      instruction file(s). Keep the list-level payload lightweight (summaries, not
      full bodies).
- [ ] `GET /api/memory/{project}` — return one project's full memory: the raw
      `MEMORY.md`, every parsed entry (name, description, type, body, resolved and
      dangling `[[links]]`), and the project-scoped instruction file if present.
      Validate `{project}` against discovered projects (reject/404 unknown values;
      never resolve arbitrary paths).
- [ ] Support `?q=` and `?type=` query params on `/api/memory` for server-side
      filtering, delegating to the memory package's filter.
- [ ] Define DTO structs for the responses (do not leak internal package types
      directly if they carry absolute paths that shouldn't be exposed — redact/relativize
      as needed, consistent with how sessions expose file paths).
- [ ] Handler tests using a temp `claudeDir` fixture: list returns projects, detail
      returns entries, unknown project 404s, `?type=` filters.

## Acceptance Criteria

- `cd apps/cli && go build ./... && go test ./...` passes.
- `GET /api/memory` returns projects with memory plus global instruction file(s).
- `GET /api/memory/{project}` returns full entries with resolved/dangling links, and
  404s for unknown or path-traversing `{project}` values.
- `?q=` / `?type=` filtering works and is handled server-side.
- No absolute filesystem paths are exposed beyond what sessions already expose.
