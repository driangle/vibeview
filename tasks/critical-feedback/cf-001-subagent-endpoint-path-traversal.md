---
id: "cf-001"
title: "Validate and contain agentId in the subagent endpoint"
status: completed
priority: critical
effort: small
type: bug
tags: [security, backend]
group: critical-feedback
phase: critical-feedback
touches: ["cli/server"]
created: 2026-08-03
context:
  - "apps/cli/internal/server/server.go"
  - "apps/lib/pathutil/pathutil.go"
completed_at: 2026-08-03
---

# Validate and contain agentId in the subagent endpoint

## Findings

`handleGetSubagent` takes `agentId` straight from the URL and interpolates it into
filesystem paths with **no validation** — the only HTTP read path that does so:

- `agentPath := filepath.Join(sessionDir, "subagents", "agent-"+agentID+".jsonl")` (server.go:564)
- `metaPath := filepath.Join(sessionDir, "subagents", "agent-"+agentID+".meta.json")` (server.go:586)
- and again inside `resolveToolUseAgentID` (server.go:612-666)

The rest of the codebase is careful here — `SessionFilePath` calls
`pathutil.ValidateSessionID` and `broker.startTailer` calls `pathutil.SafeResolve`
against `claudeDir`. The subagent handler calls **neither**, even though those helpers
exist and are tested against `../../../etc/passwd`. `grep -c SafeResolve server.go` == 0.

`filepath.Join` cleans embedded `..`, so a crafted `agentId` can walk out of
`sessionDir/subagents`. Go 1.22's single-segment `{agentId}` wildcard blunts raw-slash
inputs, but relying on router path-cleaning as the *only* security boundary (vs.
`%2F`-encoded segments and the `tool_use_` re-resolution branch at server.go:558-562) is
exactly the defense-in-depth gap the existing helpers were built to close.

## Acceptance Criteria

- [x] Validate `agentId` format before use (e.g. reject anything outside `^[a-zA-Z0-9_-]+$`)
- [x] Resolve the final `agentPath`/`metaPath` with `pathutil.SafeResolve` against `claudeDir` and reject paths that escape the session's `subagents/` directory
- [x] Apply the same containment inside `resolveToolUseAgentID`
- [x] Add HTTP-layer tests covering traversal payloads (`..`, encoded `%2F`, symlink escape)

## verify
```yaml
verify:
  - type: bash
    run: "go test ./internal/server/... -run Subagent -v"
    dir: "apps/cli"
  - type: assert
    check: "agentId containing path-traversal sequences returns 400/404 and never opens a file outside the session subagents directory"
```
