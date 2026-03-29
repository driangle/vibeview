---
title: "Explicit Claude Code session format version compatibility"
id: "01kmxj4ck"
status: pending
priority: medium
type: feature
tags: ["compatibility", "session-format"]
created: "2026-03-29"
---

# Explicit Claude Code session format version compatibility

## Objective

Make vibeview's dependency on the Claude Code session format explicit rather than implicit. Currently, vibeview silently parses whatever it finds — if Claude Code changes its session format, vibeview degrades without telling the user. This task adds version detection, a declared supported range, and user-facing warnings when sessions fall outside that range.

The precise implementation details (e.g. where warnings appear, exact version range syntax, API surface) should be discussed with the user at implementation time.

## Tasks

- [ ] Define a supported Claude Code version range as a constant in the `claude` package
- [ ] Extract the Claude Code version from session messages during enrichment (the `version` field already exists on `Message`)
- [ ] Store the detected version on `SessionMeta` so it's available without re-parsing
- [ ] Add compatibility checking logic that compares detected version against supported range
- [ ] Surface warnings in CLI output when sessions are from unsupported versions
- [ ] Surface warnings in web UI (e.g. badge or banner) for sessions from unsupported versions
- [ ] Expose supported version range in an API endpoint (e.g. `/api/info`)
- [ ] Add tests for version extraction, range checking, and edge cases (missing version, unknown format)

## Acceptance Criteria

- A supported version range is declared as a constant and easy to update when new Claude Code versions are tested
- Sessions created by Claude Code versions outside the supported range display a visible warning to the user
- Sessions with no version information (older format) are handled gracefully with an appropriate notice
- The detected Claude Code version is available on session metadata
- An API endpoint exposes the supported version range
