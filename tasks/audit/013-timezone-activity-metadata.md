---
id: "audit-013"
title: "Fix timezone handling and activity state edge cases"
status: completed
priority: medium
effort: small
type: bug
tags: [data-integrity, backend, frontend]
group: audit
touches: ["cli/session/activity", "web/utils"]
context:
  - "apps/web/src/utils.ts"
  - "apps/cli/internal/session/activity.go"
  - "apps/cli/internal/claude/claude.go"
---

# Fix timezone handling and activity state edge cases

## Findings

### MEDIUM: Timezone mismatch in frontend date display (utils.ts:13)
`formatTime()` converts UTC timestamps using `toLocaleDateString()` but relative time calculations may be off near midnight/timezone boundaries.

### MEDIUM: Activity state ignores future timestamps (activity.go:25-29)
Sessions with timestamps in the future (clock skew) appear permanently "active" — idle timeout never triggers.

### MEDIUM: Session ID not validated (session.go, multiple locations)
No explicit validation of session ID format at discovery time.

## Acceptance Criteria

- [x] Ensure all timestamp comparisons in formatTime() use UTC-aware parsing
- [x] Add sanity check: clamp timestamps > now + 1 hour to now
- [x] Add session ID format validation at discovery time
- [x] Add settings file permission fix: use 0o600 instead of 0o644
