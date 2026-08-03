---
title: "Split main.go into focused files (under 200 lines)"
id: "01kpy1068"
status: pending
priority: medium
type: chore
tags: ["refactor"]
created: "2026-04-23"
---

# Split main.go into focused files (under 200 lines)

## Objective

Split `apps/cli/cmd/vibeview/main.go` (899 lines) so no resulting file exceeds 200 lines. The file mixes CLI command wiring with report structs, report builders, and serve helpers. A single extraction is not enough — break it into several cohesive files.

## Tasks

- [ ] Keep in `main.go` — top-level wiring and small commands: `fullVersion`, `main`, `inspectCmd`, `searchCmd`
- [ ] Create `webcmd.go` — the web/serve command and its helpers: `webCmd`, `generateToken`, `localLANIP`, `printQRCode`, `openBrowser`
- [ ] Create `reports.go` — all report structs (`inspectReport`, `searchReport`, `searchResultEntry`, `directoryReport`, `fileReport`, `lookupReport`, `resolutionReport`, `enrichmentReport`, `parseReport`, `messageReport`, `usageReport`, `insightsReport`, `toolEntry`, `errorDetail`, `subagentDetail`)
- [ ] Create `reportbuilders.go` — builders except lookup: `buildFileReport`, `extractTitle`, `buildDirectoryReport`, `findSessionOnDisk`, `buildMessageReport`, `buildUsageReport`, `buildInsightsReport`
- [ ] Create `lookup.go` — `buildLookupReport` (the largest single builder)
- [ ] Create `output.go` — output/orchestration helpers: `unwrapReport`, `outputAny`, `discoverAndEnrich`, `doSearch`
- [ ] Run `make check` to confirm everything compiles and tests pass

## Acceptance Criteria

- No non-test `.go` file resulting from this split exceeds 200 lines
- `main.go` contains only CLI command wiring for `main`/`inspectCmd`/`searchCmd`
- Report types, builders, and serve helpers live in their own files
- `make check` passes
