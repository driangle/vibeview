---
title: "Setup Prettier for code formatting"
id: "01km1dved"
status: pending
priority: medium
type: chore
tags: ["tooling"]
created: "2026-03-18"
---

# Setup Prettier for code formatting

## Objective

Add Prettier to the project for consistent code formatting across the codebase.

## Tasks

- [ ] Install `prettier` as a dev dependency
- [ ] Create a `.prettierrc` config file with project conventions
- [ ] Add a `.prettierignore` for build artifacts and generated files
- [ ] Add `format` and `format:check` scripts to `package.json`
- [ ] Run Prettier on the existing codebase
- [ ] Verify the formatted code builds and tests pass

## Acceptance Criteria

- `prettier` is installed as a dev dependency
- Running the format script reformats all source files consistently
- A `.prettierrc` config exists at the project root
- Build and tests still pass after formatting
