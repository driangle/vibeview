---
title: "Add lint rule to enforce 200-line limit on Go files"
id: "01kpy1089"
status: pending
priority: medium
type: chore
tags: ["lint", "ci"]
depends-on: ["01kpy105f", "01kpy1068", "01kpy106r", "01kz462an", "01kz462ap", "01kz462j6", "01kz462aq", "01kz462nt", "01kz462re", "01kz462ar", "01kz462vm", "01kz462as"]
created: "2026-04-23"
---

# Add lint rule to enforce 200-line limit on Go files

## Objective

Add a lint check to `make check-lite` that fails if any non-test Go file exceeds 200 lines. This matches the web project's ESLint `max-lines` limit (see `01kks39gg`) — Go code is typically denser than TypeScript, so the same or a stricter limit applies. This prevents large files from accumulating and enforces the project's file organization principles.

## Tasks

- [ ] Add a script or Makefile target that finds all `*.go` files (excluding `*_test.go`), counts lines, and fails if any exceed 200
- [ ] Integrate the check into the `check-lite` Make target
- [ ] Verify that the check passes after the three file-split tasks are complete
- [ ] Verify the check correctly catches a file over 200 lines (manual test)

## Acceptance Criteria

- `make check-lite` fails with a clear error message listing offending files when any non-test `.go` file exceeds 200 lines
- Test files (`*_test.go`) are excluded from the check
- The check runs fast (no compilation needed)
- `make check-lite` passes on the current codebase (after split tasks are done)
