---
id: "cf-002"
title: "Apply SafeResolve on the session read path for symlink parity"
status: pending
priority: high
effort: small
type: bug
tags: [security, backend]
group: critical-feedback
phase: critical-feedback
touches: ["cli/server"]
created: 2026-08-03
context:
  - "apps/cli/internal/server/server.go"
  - "apps/lib/session/session.go"
  - "apps/lib/pathutil/pathutil.go"
---

# Apply SafeResolve on the session read path for symlink parity

## Findings

`handleGetSession` (server.go:501-506) resolves the path with
`session.ResolveFilePath` — which returns `meta.FilePath` verbatim when set
(session.go:623-624) — and then `os.Open`s it directly with **no symlink-containment
check**. This is asymmetric with the tailer path, which guards every session file with
`pathutil.SafeResolve` (broker.go:171).

Index construction skips symlinks during discovery, so the practical risk is lower than
cf-001, but the inconsistency is real: the live/SSE read is contained and the one-shot
HTTP read is not. A session entry whose file is a symlink would be followed on read.

## Acceptance Criteria

- [ ] Call `pathutil.SafeResolve(path, claudeDir)` in `handleGetSession` before `os.Open`, returning 400 on failure
- [ ] Confirm the same guard covers any other handler that opens a session file directly
- [ ] Add a test that a symlinked session file resolving outside `~/.claude` is rejected

## verify
```yaml
verify:
  - type: bash
    run: "go test ./internal/server/... -run Symlink -v"
    dir: "apps/cli"
  - type: assert
    check: "A session whose file symlinks outside ~/.claude is rejected on the /api/sessions/{id} read path"
```
