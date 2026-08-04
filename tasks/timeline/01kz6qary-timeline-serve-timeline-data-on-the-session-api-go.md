---
id: "01kz6qary"
title: "Timeline: serve timeline data on the session API (Go)"
status: pending
priority: high
effort: small
phase: timeline
dependencies: ["01kz6qarv"]
tags: ["backend", "timeline", "go", "api"]
created_at: 2026-08-04
---

# Timeline: serve timeline data on the session API (Go)

## Objective

Expose the exchanges ([[01kz6qarr]]) and timeline insights ([[01kz6qarv]]) to the web client
by attaching them to the existing single-session response, so the Timeline tab renders
server-provided values with no extra round-trip.

## Design reference

Field shapes should match what the client renders per the Track design:
`~/Downloads/Timeline view design directions-handoff.zip` → `.../Timeline Track.dc.html`.

## Context

- `handleGetSession` (`apps/cli/internal/server/server.go:581`) already parses `messages`
  and builds `insights.Extract(messages)` (~line 625). Compute the timeline right there.
- Response type `SessionDetailResponse` (`server.go:1083`) embeds `SessionResponse` and
  carries `Messages`, `Insights`, `SkippedLines`. Add a `Timeline` field.
- Prefer extending this response over a new endpoint (the client already fetches it via
  `GET /api/sessions/{id}`).

## Tasks

- [ ] Add `Timeline *timeline.TimelineResponse` (exchanges + insights) to
      `SessionDetailResponse` with a `json:"timeline,omitempty"` tag.
- [ ] Populate it in `handleGetSession` from the already-parsed `messages`.
- [ ] Apply redaction consistently with the rest of the response (prompt previews,
      commands, file paths) — reuse the `redact` helpers used elsewhere in the handler.
- [ ] Handler/server test: a fixture session returns a non-empty `timeline` with exchanges
      and insights; an empty session returns an empty-but-valid structure.

## Acceptance Criteria

- `GET /api/sessions/{id}` includes a `timeline` object with `exchanges` and `insights`.
- Sensitive strings in timeline fields are redacted like the rest of the payload.
- `go test ./...` passes; `make check` stays green.
