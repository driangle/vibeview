---
id: "cf-007"
title: "Return partial session content instead of a blanket 500 on parse error"
status: completed
priority: medium
effort: small
type: improvement
tags: [robustness, backend, api]
group: critical-feedback
phase: critical-feedback
touches: ["cli/server"]
created: 2026-08-03
dependencies: ["cf-006"]
context:
  - "apps/cli/internal/server/server.go"
  - "apps/lib/claude/claude.go"
completed_at: 2026-08-03
---

# Return partial session content instead of a blanket 500 on parse error

## Findings

`handleGetSession` maps **any** parse error to `500 "failed to parse session"`
(server.go:513-517), discarding the partial-parse information the parser already produced
— the successfully parsed `messages` and the `SkippedLines` count. The parser goes out of
its way to degrade gracefully (skip-and-count malformed lines), but the handler throws
that away on the first hard error.

The frontend already renders a `SkippedLines` indicator, so the data model supports
partial results end to end.

## Acceptance Criteria

- [x] Render whatever parsed successfully rather than 500-ing the whole request when a parse error is recoverable
- [x] Reserve 5xx for genuinely unreadable files (I/O error), and distinguish that from partial-parse cases
- [x] Ensure `SkippedLines` (and any oversized-line count from cf-006) is reported on the partial response
- [x] Add a handler test asserting partial content + skipped count on a session with a malformed line

## verify
```yaml
verify:
  - type: bash
    run: "go test ./internal/server/... -run GetSession -v"
    dir: "apps/cli"
  - type: assert
    check: "A session with a malformed line returns 200 with the parsed messages and a non-zero skipped count, not a 500"
```
