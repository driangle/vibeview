---
title: "Tag and publish lib v0.1.0"
id: "01kpgs25d"
status: pending
priority: medium
type: chore
tags: ["lib", "phase:3-publish"]
effort: small
dependencies: ["01kpgs249"]
context: ["docs/specs/2026-04-18-extract-go-library.md", "apps/lib/go.mod"]
created: "2026-04-18"
---

# Tag and publish lib v0.1.0

## Objective

Tag and publish the library module so external consumers (like `doer`) can `go get` it. Replace the `replace` directive in the CLI's `go.mod` with a real version once the tag is pushed.

## Tasks

- [ ] Ensure `apps/lib/go.mod` has no `replace` directives
- [ ] Create git tag `apps/lib/v0.1.0` (Go multi-module convention: `<module-dir>/v<semver>`)
- [ ] Push the tag: `git push origin apps/lib/v0.1.0`
- [ ] Verify the module is fetchable: `GONOSUMDB=* go get github.com/driangle/vibeview/lib@v0.1.0`
- [ ] Update `apps/cli/go.mod` to use the published version instead of `replace` directive (or keep `replace` for local dev — document the choice)

## Acceptance Criteria

- `apps/lib/v0.1.0` tag exists on the remote
- `go get github.com/driangle/vibeview/lib@v0.1.0` works from a clean module
- The library's public API is usable as shown in the spec's usage example
