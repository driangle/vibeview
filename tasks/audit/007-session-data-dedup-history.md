---
id: "audit-007"
title: "Harden history file parsing and session deduplication"
status: pending
priority: high
effort: medium
type: bug
tags: [data-integrity, backend]
group: audit
touches: ["cli/session", "cli/watcher/broker"]
context:
  - "apps/cli/internal/session/session.go"
  - "apps/cli/internal/watcher/broker.go"
---

# Harden history file parsing and session deduplication

## Findings

### CRITICAL: Truncated history.jsonl handling (broker.go:247-288)
If history.jsonl is truncated during rotation/corruption, the scanner may read partial JSON lines. The returned offset could point mid-object, causing the next read to skip or misparse entries.

### HIGH: Session deduplication based on timestamp only (session.go:128-148)
Duplicate history entries with identical timestamps are silently lost. No secondary key is used.

### MEDIUM: Malformed JSONL lines silently skipped (claude.go:309-312)
No count or indicator of which/how many lines were corrupted.

## Acceptance Criteria

- [ ] Validate file size after scanning and detect truncation
- [ ] Implement line-boundary detection before returning offset
- [ ] Use a secondary key (e.g., file offset or discovery order) for deduplication
- [ ] Return `ParseResult` with `SkippedLines int` so callers can warn users
- [ ] Log first 100 chars of malformed lines for debugging
