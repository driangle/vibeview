---
title: "Setup Prettier for code formatting"
id: "01km1dved"
status: completed
priority: medium
type: chore
tags: ["tooling"]
created: "2026-03-18"
---

# Setup Prettier for code formatting

## Objective

Add Prettier to the project for consistent code formatting across the codebase.

## Tasks

- [x] Install `prettier` as a dev dependency
- [x] Create a `.prettierrc` config file with project conventions
- [x] Add a `.prettierignore` for build artifacts and generated files
- [x] Add `format` and `format:check` scripts to `package.json`
- [x] Run Prettier on the existing codebase
- [x] Verify the formatted code builds and tests pass

## Acceptance Criteria

- `prettier` is installed as a dev dependency
- Running the format script reformats all source files consistently
- A `.prettierrc` config exists at the project root
- Build and tests still pass after formatting
