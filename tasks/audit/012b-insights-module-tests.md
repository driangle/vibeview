---
id: "audit-012b"
title: "Add tests for insights module (60%+ coverage)"
status: pending
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

- [ ] Add tests for commands extraction
- [ ] Add tests for errors extraction
- [ ] Add tests for files extraction
- [ ] Add tests for skills extraction
- [ ] Add tests for worktrees extraction
- [ ] Add tests for helper functions
- [ ] Create test fixtures in `apps/cli/testdata/fixtures/` with edge-case JSONL files

## Acceptance Criteria

- [ ] Insights module has 60%+ test coverage
- [ ] `apps/cli/testdata/fixtures/` directory exists with edge-case JSONL files
