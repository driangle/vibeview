---
title: "Extract response types and middleware from server.go"
id: "01kpy105f"
status: pending
priority: medium
type: chore
tags: ["refactor"]
created: "2026-04-23"
---

# Extract response types and middleware from server.go

## Objective

Split `apps/cli/internal/server/server.go` (971 lines) into focused files by extracting two independent concerns: response types and middleware.

## Tasks

- [ ] Create `responses.go` — move all response structs (`ConfigResponse`, `SessionResponse`, `PaginatedSessionsResponse`, `SearchResultResponse`, `SearchResponse`, `SubagentDetailResponse`, `SessionDetailResponse`, `MessageResponse`, `ActivityDayResponse`, `ActivityHourResponse`, `ActivityResponse`) plus conversion helpers (`toSessionResponse`, `toMessageResponse`, `msToISO`, `writeJSON`)
- [ ] Create `middleware.go` — move CORS and auth middleware (`localhostOrigins`, `isPrivateIP`, `isAllowedOrigin`, `corsHandler`, `tokenAuthMiddleware`)
- [ ] Verify `server.go` is under 500 lines after extraction
- [ ] Run `make check` to confirm everything compiles and tests pass

## Acceptance Criteria

- `server.go` contains only the `Server` struct, constructor, routes, and HTTP handlers
- `responses.go` contains all response types and conversion helpers
- `middleware.go` contains CORS and auth middleware
- No new files exceed 500 lines
- `make check` passes
