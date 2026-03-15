---
title: "Investigate 'has no JSONL file' warning"
id: "01kksnpvv"
status: pending
priority: medium
type: bug
tags: ["sessions", "logging"]
created: "2026-03-15"
---

# Investigate 'has no JSONL file' warning

## Steps to Reproduce

1. Run VibeView and observe stderr/logs
2. Warning messages appear for sessions that have a `history.jsonl` entry but no corresponding session JSONL file on disk

## Actual Behavior

Warnings like "has no JSONL file" are logged during session indexing for some sessions.

## Investigation Needed

This may be a bug or expected behavior. Two hypotheses:

1. **Bug**: Session JSONL files are missing due to a path resolution issue, race condition, or deleted files
2. **Expected**: These are "virtual" usage conversations (e.g. API usage tracking entries in `history.jsonl` that don't have actual conversation data) — if so, the warning is noise and should be removed or downgraded

## Tasks

- [ ] Identify which sessions trigger the warning — check if they follow a pattern (e.g. specific project paths, session ID formats, timestamps)
- [ ] Check if the sessions are "virtual" usage/billing conversations that Claude Code creates without actual JSONL data
- [ ] If bug: fix the path resolution or file discovery logic so the JSONL files are found
- [ ] If expected: either suppress the warning for virtual sessions or downgrade to debug-level logging

## Acceptance Criteria

- Root cause is identified and documented
- If bug: the missing JSONL files are correctly resolved and the warning no longer appears
- If expected: the warning is removed or suppressed for virtual/non-conversation sessions, so logs are clean during normal operation
