---
id: "cf-008"
title: "Unify messageEvent and MessageResponse to stop SSE/fetch field drift"
status: pending
priority: medium
effort: small
type: improvement
tags: [architecture, backend]
group: critical-feedback
phase: critical-feedback
touches: ["cli/server", "cli/watcher/broker"]
created: 2026-08-03
context:
  - "apps/cli/internal/watcher/broker.go"
  - "apps/cli/internal/server/server.go"
---

# Unify messageEvent and MessageResponse to stop SSE/fetch field drift

## Findings

`messageEvent` (broker.go:454-466) is a hand-maintained parallel copy of
`MessageResponse` (server.go:903-919). The comment at broker.go:453 ("matches the
MessageResponse type") acknowledges the coupling, but nothing enforces it — and they have
**already diverged**.

The live SSE path (`toMessageEvent`, broker.go:468) omits `MessageKind`, `ChannelInfo`,
`Content`, `PermissionMode`, and `Attachment` that the fetch path (`toMessageResponse`,
server.go:937) includes. So a message rendered live via SSE carries strictly less data
than the same message after a page refresh — a latent frontend-inconsistency bug driven
purely by the type duplication.

## Acceptance Criteria

- [ ] Collapse the two DTOs into a single shared type (and a single `toMessageResponse`/`toMessageEvent` builder) so SSE and fetch cannot diverge
- [ ] Confirm the SSE payload now carries the same fields as the fetch payload
- [ ] Add a test asserting field parity between the live and fetched representations of a message

## verify
```yaml
verify:
  - type: bash
    run: "go build ./... && go test ./internal/... -v"
    dir: "apps/cli"
  - type: assert
    check: "A message delivered over SSE and the same message fetched via /api/sessions/{id} serialize the same fields"
```
