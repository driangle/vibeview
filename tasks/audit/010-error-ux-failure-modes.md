---
id: "audit-010"
title: "Improve error display, connection status, and failure mode UX"
status: completed
priority: high
effort: medium
type: improvement
tags: [frontend, ux]
group: audit
touches: ["web/pages/SessionList", "web/pages/SessionView", "web/hooks/useSessionStream"]
context:
  - "apps/web/src/pages/SessionList.tsx"
  - "apps/web/src/pages/SessionView.tsx"
  - "apps/web/src/hooks/useSessionStream.ts"
  - "apps/web/src/hooks/useSessionData.ts"
  - "apps/web/src/pages/Settings.tsx"
---

# Improve error display, connection status, and failure mode UX

## Findings

### HIGH: Generic error display (SessionList.tsx:300-304)
Only shows "Failed to load sessions. Is the server running?" — no details, no retry button.

### HIGH: Missing tool results render incomplete data silently (useSessionData.ts:52)
No warning when tool_use references a tool_use_id that doesn't exist.

### HIGH: Corrupted JSONL lines silently skipped (claude.go:308-312)
No count or warning to user about missing data.

### MEDIUM: No connection status indicator (useSessionStream.ts)
Hook tracks status but UI doesn't display it — users can't tell if data is live or stale.

### MEDIUM: Settings validation errors are technical (settings.go:105-137)
No field-level error highlighting in UI.

### MEDIUM: Tailer file read errors silently dropped (tailer.go:89-98)
Subscribers don't know why updates stopped.

### MEDIUM: No debug logging toggle at runtime (logutil.go)
Cannot adjust verbosity without restarting.

## Acceptance Criteria

- [x] Show error details with HTTP status and retry button on API failures
- [x] Warn users when tool results are missing: "Some tool outputs are missing"
- [x] Display connection status badge (Live/Reconnecting/Offline) in SessionView
- [x] Surface skipped line count from backend to frontend
- [x] Add field-level validation errors in Settings UI
- [x] Log tailer errors and notify clients via SSE error event
