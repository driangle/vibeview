---
title: "Show full filepath of session JSONL file in session view"
id: "01kks07g8"
status: pending
priority: medium
type: feature
tags: []
created: "2026-03-15"
---

# Show full filepath of session JSONL file in session view

## Objective

Display the full filesystem path of the session's JSONL file on the session view page, so users can easily locate and access the raw session data on disk.

## Tasks

- [ ] Determine where the session JSONL filepath is available in the data model
- [ ] Pass the filepath to the session view component
- [ ] Display the filepath in the session view UI (e.g. below the session header)
- [ ] Ensure the path is selectable/copyable for convenience

## Acceptance Criteria

- The session view page shows the full absolute path to the session's JSONL file
- The filepath is visible without requiring extra clicks or navigation
- The displayed path matches the actual file location on disk
