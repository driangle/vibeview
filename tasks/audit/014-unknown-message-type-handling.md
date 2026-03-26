---
id: "audit-014"
title: "Handle unknown message types and incomplete session data gracefully"
status: pending
priority: high
effort: small
type: bug
tags: [frontend, reliability]
group: audit
touches: ["web/types", "web/hooks/useSessionData"]
context:
  - "apps/web/src/types.ts"
  - "apps/web/src/hooks/useSessionData.ts"
---

# Handle unknown message types and incomplete session data gracefully

## Findings

### HIGH: Unhandled message type scenarios (types.ts:58-76)
`MessageResponse.type` is a discriminated union, but unknown types from updated servers are not caught at runtime. No logging when encountering unknown types.

### HIGH: No graceful degradation for missing tool results (useSessionData.ts:14-27)
If a tool_use references a non-existent tool_use_id (corrupted/incomplete session), data renders incomplete with no warning.

## Acceptance Criteria

- [ ] Log unknown message types: `console.warn('Unknown message type:', msg.type)`
- [ ] Render unknown message types with a fallback "Unknown message type" UI
- [ ] Track and display missing tool results: "N tool outputs missing"
- [ ] Handle content blocks with unexpected shapes (object instead of string/array)
