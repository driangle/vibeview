---
title: "Tag and publish lib v0.1.0"
id: "01kpgs25d"
status: completed
priority: medium
type: chore
tags: ["lib", "phase:3-publish"]
effort: small
dependencies: ["01kpgs249"]
context: ["docs/specs/2026-04-18-extract-go-library.md", "apps/lib/go.mod"]
created: "2026-04-18"
completed_at: 2026-08-01
---

# Tag and publish lib v0.1.0

## Objective

Tag and publish the library module so external consumers (like `doer`) can `go get` it. Replace the `replace` directive in the CLI's `go.mod` with a real version once the tag is pushed.

## Tasks

- [x] Ensure `apps/lib/go.mod` has no `replace` directives
- [x] Create git tag `apps/lib/v0.1.0` (Go multi-module convention: `<module-dir>/v<semver>`)
- [x] Push the tag: `git push origin apps/lib/v0.1.0`
- [x] Verify the module is fetchable: `GOPROXY=direct GOSUMDB=off go get github.com/driangle/vibeview/apps/lib@v0.1.0`
- [x] Update `apps/cli/go.mod` to use the published version instead of `replace` directive (or keep `replace` for local dev — document the choice)

## Resolution

The module path was `github.com/driangle/vibeview/lib` but the module lives in
`apps/lib/`. Go requires a submodule's directory (relative to repo root) to equal
its module-path suffix and its tag prefix, so that path was unfetchable — Go would
look for it in `lib/` at the repo root. Renamed the module path to
`github.com/driangle/vibeview/apps/lib` (matching the directory and the
already-planned `apps/lib/v0.1.0` tag) and updated all imports.

Kept the `replace github.com/driangle/vibeview/apps/lib => ../lib` directive in
`apps/cli/go.mod` for local monorepo development and bumped the `require` to
`v0.1.0` so external builds resolve the published version.

## Acceptance Criteria

- [x] `apps/lib/v0.1.0` tag exists on the remote
- [x] `go get github.com/driangle/vibeview/apps/lib@v0.1.0` works from a clean module
- [x] The library's public API is usable as shown in the spec's usage example
