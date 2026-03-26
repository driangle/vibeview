---
id: "audit-012b"
title: "Add tests for insights module (60%+ coverage)"
status: completed
priority: high
effort: medium
tags: [testing]
group: audit
parent: "audit-012"
created: 2026-03-26
touches: ["cli/insights"]
context:
  - "apps/cli/internal/insights/"
---

# Add tests for insights module (60%+ coverage)

## Objective

The insights module contains critical business logic for extracting skills, commands, errors, files, and worktrees from session data. It currently has zero tests. Add comprehensive tests targeting 60%+ coverage.

## Tasks

- [x] Add tests for commands extraction
- [x] Add tests for errors extraction
- [x] Add tests for files extraction
- [x] Add tests for skills extraction
- [x] Add tests for worktrees extraction
- [x] Add tests for helper functions
- [x] Create test fixtures in `apps/cli/testdata/fixtures/` with edge-case JSONL files

## Acceptance Criteria

- [x] Insights module has 60%+ test coverage
- [x] `apps/cli/testdata/fixtures/` directory exists with edge-case JSONL files
