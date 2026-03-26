---
id: "audit-002"
title: "Restrict CORS policy to localhost origins"
status: completed
priority: critical
effort: small
type: bug
tags: [security, backend]
group: audit
touches: ["cli/server"]
context:
  - "apps/cli/internal/server/server.go"
---

# Restrict CORS policy to localhost origins

## Findings

### HIGH: Permissive CORS headers (server.go:126-138)
Server responds with `Access-Control-Allow-Origin: *`. Any website can query the localhost API while VibeView is running, extracting session metadata, performing searches, and even modifying settings via PUT.

## Acceptance Criteria

- [x] Restrict `Access-Control-Allow-Origin` to the actual localhost origin (e.g., `http://localhost:<port>`)
- [x] Validate `Origin` header before responding with CORS headers
- [x] Add warning log if server is bound to non-loopback address

## verify
```yaml
verify:
  - type: bash
    run: "go test ./internal/server/... -run CORS -v"
    dir: "apps/cli"
  - type: assert
    check: "CORS header is not wildcard *"
```
