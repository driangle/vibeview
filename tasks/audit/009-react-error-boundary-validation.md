---
id: "audit-009"
title: "Add React Error Boundaries and runtime data validation"
status: pending
priority: critical
effort: medium
type: bug
tags: [frontend, reliability]
group: audit
touches: ["web/App", "web/api", "web/hooks"]
context:
  - "apps/web/src/App.tsx"
  - "apps/web/src/api.ts"
  - "apps/web/src/hooks/useSessionStream.ts"
  - "apps/web/src/hooks/useSessionData.ts"
  - "apps/web/src/types.ts"
---

# Add React Error Boundaries and runtime data validation

## Findings

### CRITICAL: No Error Boundaries (App.tsx)
Any unhandled error in a child component crashes the entire UI with a blank page.

### CRITICAL: Unprotected JSON.parse in EventSource handlers (useSessionStream.ts:36,46)
Malformed SSE data crashes the stream handler, leaving the stream broken.

### CRITICAL: No runtime schema validation for API responses (api.ts:1-7)
TypeScript interfaces exist but no runtime validation — malformed responses cause silent failures.

### CRITICAL: writeJSON() silently ignores encoding errors (server.go:588-592)
If JSON marshaling fails, client gets no response and no error is logged.

### MEDIUM: ContentBlock type mismatch (types.ts:38-49)
No discriminated union validation at runtime for content blocks.

## Acceptance Criteria

- [ ] Create ErrorBoundary component wrapping main routes and SessionView
- [ ] Wrap `JSON.parse()` calls in useSessionStream.ts with try-catch
- [ ] Add Zod or similar runtime validation for critical API response types
- [ ] Fix `writeJSON()` to log errors on encoding failure
- [ ] Add runtime type guards for ContentBlock type discrimination
