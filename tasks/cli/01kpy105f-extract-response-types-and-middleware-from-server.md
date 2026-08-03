---
title: "Split server.go into focused files (under 200 lines)"
id: "01kpy105f"
status: pending
priority: medium
type: chore
tags: ["refactor"]
created: "2026-04-23"
---

# Split server.go into focused files (under 200 lines)

## Objective

Split `apps/cli/internal/server/server.go` (1137 lines) so no resulting file exceeds 200 lines. A single extraction is not enough at this size — the file needs to break into several cohesive files grouped by concern: the server core, middleware, response types, and handlers grouped by domain.

## Tasks

- [ ] Keep in `server.go` — server core only: `Config`, `Server`, `New`, `routes`, `ListenAndServe`, `Shutdown`
- [ ] Create `middleware.go` — CORS and auth: `localhostOrigins`, `isPrivateIP`, `isAllowedOrigin`, `corsHandler`, `tokenAuthMiddleware`, `requestHasValidToken`, `tokensEqual`
- [ ] Create `responses.go` — all response structs (`ConfigResponse`, `ActivityDayResponse`, `ActivityHourResponse`, `ActivityResponse`, `SessionResponse`, `PaginatedSessionsResponse`, `SearchResultResponse`, `SearchResponse`, `SubagentDetailResponse`, `SessionDetailResponse`, `MessageResponse`) plus converters (`toSessionResponse`, `toMessageResponse`, `msToISO`, `writeJSON`)
- [ ] Create `handlers_config.go` — config/health/settings/projects handlers: `handleAuthStream`, `handleConfig`, `handleHealth`, `handleGetSettings`, `handleUpdateSettings`, `handleGetProjects`, `handleUpdateProjects`, `resolveProjectDirs`
- [ ] Create `handlers_sessions.go` — session listing/filter/sort: `filterByDirs`, `sortSessions`, `sessionLess`, `sessionSortName`, `handleListSessions`
- [ ] Create `handlers_session.go` — single-session handlers: `handleGetSession`, `handleSessionStream`
- [ ] Create `subagent.go` — subagent resolution: `handleGetSubagent`, `safeSubagentPath`, `resolveToolUseAgentID`
- [ ] Create `handlers_search.go` — `handleSearch`, `handleActivity`
- [ ] Run `make check` to confirm everything compiles and tests pass

## Acceptance Criteria

- No non-test `.go` file in `apps/cli/internal/server/` exceeds 200 lines
- `server.go` contains only the `Server` struct, constructor, routes, and lifecycle
- Handlers are grouped by domain; middleware and response types are in their own files
- `make check` passes
