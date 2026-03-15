---
title: "Use session display name from rename command"
id: "01kkry6fg"
status: pending
priority: medium
type: bug
effort: small
tags: ["frontend", "backend"]
phase: "polish"
dependencies: ["01kkqx982", "01kkqx2e3"]
created: "2026-03-15"
---

# Use session display name from rename command

## Objective

In Claude Code, users can run `/rename` to set a custom session name. The session list should prioritize this display name over the slug (first message preview). Currently the slug is shown even when a display name exists.

## Tasks

- [ ] Investigate how Claude Code stores the renamed session name in JSONL data
- [ ] Ensure the backend parses and returns the display name correctly
- [ ] Update the session list to prefer `display` over `slug` when both are available
- [ ] Update the session detail view to show the display name as the title

## Acceptance Criteria

- Sessions renamed with `/rename` show their custom name in the session list
- The display name takes priority: display > slug > session ID
- Sessions without a custom name continue to show the slug as before
