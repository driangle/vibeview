---
id: "cf-004"
title: "Address LAN plaintext transport and permissive private-IP CORS"
status: pending
priority: medium
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
---

# Address LAN plaintext transport and permissive private-IP CORS

## Findings

In LAN mode the server binds `0.0.0.0` over **plaintext HTTP** (main.go:174), so the token
and all session contents (a user's entire Claude history) traverse the LAN unencrypted.
The only mitigation today is the startup warning (main.go:212).

CORS in LAN mode allows **any** RFC1918 origin — `isAllowedOrigin` → `isPrivateIP`
(server.go:188-210, 168-184) — so every host on the local network is a permitted browser
origin, and auth rests solely on the token (see cf-003).

Related prior work: `audit-002` tightened localhost CORS but predates the LAN transport
concern; this ticket is specifically about the LAN exposure surface.

## Acceptance Criteria

- [ ] Decide and document the intended LAN threat model (trusted LAN vs. hostile LAN)
- [ ] Offer an encrypted option (e.g. self-signed TLS or a documented reverse-proxy/tunnel recipe) so contents aren't sent in cleartext
- [ ] Reconsider whether "any private IP origin" is the right CORS default in LAN mode, or whether it should be an explicit allowlist
- [ ] Make the startup warning state precisely what is exposed and to whom

## verify
```yaml
verify:
  - type: assert
    check: "LAN mode provides an encrypted transport option and its CORS/exposure behavior is documented and intentional, not incidental"
```
