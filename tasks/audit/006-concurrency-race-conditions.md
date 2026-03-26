---
id: "audit-006"
title: "Fix race conditions in index compaction and tailer offset"
status: pending
priority: critical
effort: medium
type: bug
tags: [data-integrity, backend, concurrency]
group: audit
touches: ["cli/session", "cli/watcher/tailer", "cli/watcher/broker"]
context:
  - "apps/cli/internal/session/session.go"
  - "apps/cli/internal/watcher/tailer.go"
  - "apps/cli/internal/watcher/broker.go"
---

# Fix race conditions in index compaction and tailer offset

## Findings

### CRITICAL: Race in index compaction (session.go:287-306)
During batch enrichment, sessions marked for deletion (SessionID="") are visible to concurrent readers via `GetSessions()`.

### CRITICAL: Seek position discrepancy on scanner error (broker.go:283)
After a scanner error, `f.Seek(0, 1)` may return incorrect position due to buffered data.

### HIGH: Tailer offset mutation without synchronization (tailer.go:119-123)
`t.offset` is written in `readNewLines()` without a lock while `loop()` may read it concurrently.

### HIGH: Empty slug prevents enrichment completion (session.go:376-390)
Sessions with no user messages are never considered "enriched" — causes repeated re-enrichment attempts.

## Acceptance Criteria

- [ ] Use a separate tombstone map or filter internally during compaction — never expose empty IDs
- [ ] Check `scanner.Err()` and handle errors explicitly; re-seek to known good position
- [ ] Use atomic operations or mutex for tailer offset
- [ ] Return enrichment success based on `messageCount > 0`, not just slug presence
- [ ] Run tests with `-race` flag to verify no data races

## verify
```yaml
verify:
  - type: bash
    run: "go test -race ./internal/session/... ./internal/watcher/... -v"
    dir: "apps/cli"
```
