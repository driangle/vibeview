---
id: "cf-015"
title: "Make 'go test ./...' pass on a clean checkout"
status: pending
priority: low
effort: small
type: chore
tags: [dx, tooling, backend]
group: critical-feedback
phase: critical-feedback
touches: ["cli/spa"]
created: 2026-08-03
context:
  - "apps/cli/internal/spa/spa.go"
  - ".github/workflows/test.yml"
  - "Makefile"
---

# Make 'go test ./...' pass on a clean checkout

## Findings

`go test ./...` fails on a fresh checkout because `internal/spa/spa.go` uses
`//go:embed dist/*` and `apps/cli/internal/spa/dist/` is a build artifact that doesn't
exist until `make web`/`make build` runs:

```
internal/spa/spa.go:11:12: pattern dist/*: no matching files found
FAIL  github.com/driangle/vibeview/cmd/vibeview [setup failed]
```

CI papers over this by creating a placeholder `index.html` before running tests
(`.github/workflows/test.yml`), but a contributor running `go test ./...` locally hits a
confusing setup failure that looks like a broken repo rather than a missing build step.

## Acceptance Criteria

- [ ] `go test ./...` succeeds on a clean checkout with no manual placeholder step (e.g. commit a minimal placeholder `dist/index.html`, add a build tag, or embed a fallback)
- [ ] The chosen fix does not ship a stale SPA into release builds (release still embeds the real built `dist`)
- [ ] Document the one-command test path in the contributor/README workflow if any prerequisite remains

## verify
```yaml
verify:
  - type: bash
    run: "git clean -xdn internal/spa/dist && go test ./..."
    dir: "apps/cli"
  - type: assert
    check: "go test ./... passes on a clean checkout without a manual placeholder-dist step"
```
