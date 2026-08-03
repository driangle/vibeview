---
id: "cf-003"
title: "Harden LAN token: constant-time compare and header-only transport"
status: completed
priority: high
effort: medium
type: improvement
tags: [security, backend]
group: critical-feedback
phase: critical-feedback
touches: ["cli/server", "cli/main"]
created: 2026-08-03
context:
  - "apps/cli/internal/server/server.go"
  - "apps/cli/cmd/vibeview/main.go"
completed_at: 2026-08-03
---

# Harden LAN token: constant-time compare and header-only transport

## Findings

The token itself is fine (32 bytes from `crypto/rand`, hex-encoded — `generateToken`,
main.go:873-880). Its handling is not:

### Non-constant-time comparison
`tokenAuthMiddleware` compares with `==` (server.go:239 and 244) rather than
`subtle.ConstantTimeCompare`/`hmac.Equal` — a timing side channel. Low practical severity
against a 256-bit token over a network, but a textbook finding and a one-line fix.

### Token in the URL query string
The printed access URL and QR code embed the token as `?token=<token>` (main.go:210) and
the middleware accepts `?token=` (server.go:239). Tokens in URLs leak through browser
history, the `Referer` header to any external resource the SPA loads, and any
intermediary/access logs.

The SSE `EventSource` API can't set custom headers, which is likely why the query-param
path exists — a replacement needs to handle the stream endpoint (e.g. a short-lived
cookie set after a header-authenticated handshake, or a one-time stream ticket).

## Acceptance Criteria

- [x] Replace `==` token checks with `subtle.ConstantTimeCompare`
- [x] Prefer the `Authorization: Bearer` header; provide a header-compatible auth path for the SSE stream that does not require the token in the URL
- [x] Update the printed URL/QR and docs so the raw token is not placed in a shareable URL
- [x] Tests cover header auth, the stream auth path, and rejection of a wrong token

## verify
```yaml
verify:
  - type: bash
    run: "go test ./internal/server/... -run Token -v"
    dir: "apps/cli"
  - type: assert
    check: "Token comparison is constant-time and the SSE stream authenticates without the token appearing in the request URL"
```
