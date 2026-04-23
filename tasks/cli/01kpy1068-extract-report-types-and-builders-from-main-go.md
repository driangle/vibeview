---
title: "Extract report types and builders from main.go"
id: "01kpy1068"
status: pending
priority: medium
type: chore
tags: ["refactor"]
created: "2026-04-23"
---

# Extract report types and builders from main.go

## Objective

Split `apps/cli/cmd/vibeview/main.go` (897 lines) by extracting report types and builder functions into a dedicated file. This is the highest-value split — main.go mixes CLI command wiring with ~430 lines of report structs and builders.

## Tasks

- [ ] Create `reports.go` — move all report structs (`inspectReport`, `searchReport`, `searchResultEntry`, `directoryReport`, `fileReport`, `lookupReport`, `resolutionReport`, `enrichmentReport`, `parseReport`, `messageReport`, `usageReport`, `insightsReport`, `toolEntry`, `errorDetail`, `subagentDetail`) and builder functions (`buildFileReport`, `extractTitle`, `buildDirectoryReport`, `buildLookupReport`, `findSessionOnDisk`, `buildMessageReport`, `buildUsageReport`, `buildInsightsReport`, `unwrapReport`, `outputAny`, `doSearch`, `discoverAndEnrich`)
- [ ] Verify `main.go` is under 500 lines after extraction
- [ ] Run `make check` to confirm everything compiles and tests pass

## Acceptance Criteria

- `main.go` contains only CLI command definitions (`main`, `serveCmd`, `inspectCmd`, `searchCmd`, `statsCmd`, `showCmd`, `sessionsCmd`) and utility functions (`generateToken`, `localLANIP`, `printQRCode`, `openBrowser`)
- `reports.go` contains all report types, builders, and output helpers
- No new files exceed 500 lines
- `make check` passes
