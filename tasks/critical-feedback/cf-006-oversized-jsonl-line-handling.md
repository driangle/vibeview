---
id: "cf-006"
title: "Handle oversized JSONL lines without breaking the whole session"
status: pending
priority: high
effort: medium
type: bug
tags: [robustness, backend]
group: critical-feedback
phase: critical-feedback
touches: ["lib/claude", "cli/watcher/tailer"]
created: 2026-08-03
context:
  - "apps/lib/claude/claude.go"
  - "apps/cli/internal/watcher/tailer.go"
---

# Handle oversized JSONL lines without breaking the whole session

## Findings

Both the parser and the tailer cap the `bufio.Scanner` token at 2 MB
(`ParseSessionFile`, claude.go:339-340; tailer.go:126). A single JSONL line exceeding 2 MB
— a large tool result, an inlined base64 image — triggers `bufio.ErrTooLong`, with two
concrete failures:

### Whole session becomes unviewable
`scanner.Scan()` returns false, `ParseSessionFile` returns a non-nil error
(claude.go:356-358), and `handleGetSession` maps *any* parse error to a blanket
`500 "failed to parse session"` (server.go:513-517). One oversized line renders the entire
session unreadable with no partial content and no diagnostic. (The blanket-500 policy is
tracked separately in cf-007.)

### Tailer livelock
On `ErrTooLong` the tailer returns **without advancing the offset** (tailer.go:146-150),
so every subsequent write event re-scans the same region and re-hits the same too-long
line — repeating work on that file indefinitely.

## Acceptance Criteria

- [ ] Skip (and count/log) an over-limit line instead of aborting the parse, or raise/stream the buffer so large-but-valid lines parse
- [ ] In the tailer, advance past an over-limit line so it is not re-scanned every write
- [ ] Surface skipped oversized lines via the existing `SkippedLines` mechanism
- [ ] Add tests for a >2 MB line in both `ParseSessionFile` and the tailer

## verify
```yaml
verify:
  - type: bash
    run: "go test ./claude/... -run TooLong -v"
    dir: "apps/lib"
  - type: bash
    run: "go test ./internal/watcher/... -run TooLong -v"
    dir: "apps/cli"
  - type: assert
    check: "A session containing one >2 MB line still renders its other messages, and the tailer does not re-scan the oversized line on every write"
```
