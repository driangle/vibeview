---
id: "audit-012"
title: "Set up CI test pipeline and add critical missing tests"
status: in-progress
priority: critical
effort: large
type: chore
tags: [testing, ci]
group: audit
touches: ["cli/insights", "cli/search", "cli/server", "cli/session", "web"]
context:
  - ".github/workflows/"
  - "apps/cli/internal/insights/"
  - "apps/cli/internal/search/search.go"
  - "apps/cli/internal/server/server_test.go"
  - "apps/cli/internal/session/session_test.go"
  - "apps/web/src/"
---

# Set up CI test pipeline and add critical missing tests

## Findings

### CRITICAL: Zero web frontend tests (9,414 LOC)
No unit, integration, snapshot, or E2E tests for the React frontend.

### CRITICAL: No CI/CD test pipeline
Only release and docs workflows exist. Tests never run on PR/push.

### HIGH: Zero tests for insights module
Critical business logic (skills, commands, errors, files, worktrees extraction) completely untested.

### HIGH: No fuzz tests for JSONL parser
Parser handles arbitrary input and should be fuzz-tested.

### HIGH: Low coverage on server (34.4%) and session (38.1%)

### MEDIUM: No snapshot tests for React components
### MEDIUM: Minimal inline test fixtures — no testdata/ directory or golden files

## Acceptance Criteria

- [ ] Create `.github/workflows/test.yml` running `go test -race -cover ./...` on PR/push
- [ ] Set up Vitest + React Testing Library for web frontend
- [ ] Add tests for insights module (target 60%+ coverage)
- [ ] Add fuzz tests for `ParseMessageLine` and `ParseHistoryLine`
- [ ] Expand server_test.go and session_test.go to 60%+ coverage
- [ ] Create `apps/cli/testdata/fixtures/` with edge case JSONL files
- [ ] Add at least 3 React component tests for critical paths

## Sub-tasks

- **audit-012a** — Create CI test workflow for Go and web
- **audit-012b** — Add tests for insights module (60%+ coverage)
- **audit-012c** — Add fuzz tests and expand server/session coverage
- **audit-012d** — Set up Vitest and add React component tests

## verify
```yaml
verify:
  - type: bash
    run: "go test -race -cover ./..."
    dir: "apps/cli"
  - type: assert
    check: "CI workflow runs tests on pull requests"
```
