---
id: "audit-004"
title: "Add resource limits to prevent DoS via large inputs"
status: completed
priority: critical
effort: small
type: bug
tags: [security, backend]
group: audit
touches: ["cli/server", "cli/watcher/broker", "cli/session"]
context:
  - "apps/cli/internal/server/server.go"
  - "apps/cli/internal/watcher/broker.go"
  - "apps/cli/internal/session/session.go"
  - "apps/cli/internal/search/search.go"
---

# Add resource limits to prevent DoS via large inputs

## Findings

### CRITICAL: Unbounded request body (server.go:171)
`io.ReadAll(r.Body)` on the settings PUT endpoint has no size limit — a malicious request can exhaust memory.

### HIGH: 10MB scanner buffers (claude.go:274, tailer.go:101, broker.go:259, search.go:112)
All `bufio.Scanner` instances allocate 10MB max buffer. Multiple concurrent parses can exhaust memory.

### HIGH: Unbounded SSE client event buffering (broker.go:87)
64-event buffer per client with no max client limit — O(sessions x clients x buffer) memory.

### MEDIUM: No global search concurrency limit (search.go:41)
Each search spawns 8 goroutines; parallel searches can exhaust file descriptors.

### MEDIUM: Pagination offset not validated (server.go:268-287)
Very large offset values could cause bounds issues.

## Acceptance Criteria

- [x] Limit request body: `io.LimitReader(r.Body, 10*1024)` on settings endpoint
- [x] Reduce scanner buffer to 1-2MB or add per-line length validation
- [x] Add max clients per session and total client limits to broker
- [x] Add global search semaphore or queue
- [x] Validate pagination offset against array length before slicing
