---
id: "audit-012a"
title: "Create CI test workflow for Go and web"
status: completed
priority: critical
effort: small
tags: [testing, ci]
group: audit
parent: "audit-012"
created: 2026-03-26
touches: [".github/workflows/"]
---

# Create CI test workflow for Go and web

## Objective

Set up a GitHub Actions workflow that runs Go tests and web frontend tests on every PR and push to main, ensuring no code merges without passing tests.

## Tasks

- [x] Create `.github/workflows/test.yml`
- [x] Configure Go test job: `go test -race -cover ./...` in `apps/cli`
- [x] Configure web test job: run Vitest in `apps/web`
- [x] Trigger on `pull_request` and `push` to main

## Acceptance Criteria

- [x] `.github/workflows/test.yml` exists and runs `go test -race -cover ./...` on PR/push
- [x] Workflow includes a step for web frontend tests (can initially be a placeholder until tests exist)
