---
title: "Include session title in inspect output"
id: "01kmsg2wj"
status: completed
priority: medium
type: feature
tags: ["inspect", "output"]
created: "2026-03-28"
---

# Include session title in inspect output

## Objective

Display the session title (custom title or auto-generated slug) in the output of `vibeview inspect` for both single-file and directory modes. Currently, the title/slug is only shown in session-ID lookup mode. Adding it to file and directory reports makes it easier to identify sessions at a glance.

## Tasks

- [x] Add `Title` (or `Slug`) field to `fileReport` struct, populated from `SessionMeta.CustomTitle` (preferred) or `SessionMeta.Slug`
- [x] Render the title in `renderFileStyled()` output (e.g. after the file path line)
- [x] Include the title as a column in the `directoryReport` sessions table
- [x] Update `renderDirectoryStyled()` to display the title column
- [x] Ensure JSON and YAML output formats include the title field for both modes
- [x] Add/update tests for file and directory inspect output covering title display

## Acceptance Criteria

- `vibeview inspect <file>` displays the session title (custom title if set, otherwise slug) in styled, JSON, and YAML output
- `vibeview inspect <directory>` includes a title column in the sessions table
- Sessions with no title/slug show a sensible fallback (e.g. empty or "(untitled)")
- Existing tests pass and new tests cover title rendering in both modes
