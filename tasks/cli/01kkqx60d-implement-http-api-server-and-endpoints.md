---
title: "Implement HTTP API server and endpoints"
id: "01kkqx60d"
status: completed
priority: critical
effort: medium
type: feature
tags: ["backend", "api"]
phase: "core"
dependencies: ["01kkqx55y"]
created: "2026-03-15"
---

# Implement HTTP API server and endpoints

## Objective

Build the HTTP server using net/http with ServeMux, implementing all REST API endpoints: GET /api/sessions, GET /api/sessions/:id, and GET /api/health. The server serves JSON responses and supports query params for filtering and sorting.

## Tasks

- [ ] Set up HTTP server with `http.NewServeMux()` on configurable port
- [ ] Implement `GET /api/health` returning `{"status": "ok"}`
- [ ] Implement `GET /api/sessions` returning session list with metadata
- [ ] Add query param support: `?project=` (substring filter), `?sort=recent` (default)
- [ ] Implement `GET /api/sessions/:id` returning full session with all parsed messages
- [ ] Add JSON serialization for all response types matching the spec format
- [ ] Add CORS headers for local development
- [ ] Wire server startup into CLI main()

## Acceptance Criteria

- Server starts on configured port and responds to requests
- `/api/health` returns 200 with `{"status": "ok"}`
- `/api/sessions` returns all sessions with correct metadata fields
- `/api/sessions?project=myproject` filters correctly
- `/api/sessions/:id` returns full message history for a session
- 404 returned for unknown session IDs
- Response JSON matches the format specified in the API spec
