---
title: "Add ESLint 9 to the web project with max file line count rule"
id: "01kks39gg"
status: pending
priority: medium
type: chore
tags: ["linting", "dx"]
created: "2026-03-15"
---

# Add ESLint 9 to the web project with max file line count rule

## Objective

Set up ESLint 9 in the web project using the new flat config format. Include a rule to enforce a maximum file line count of 200 lines to keep files focused and maintainable.

## Tasks

- [ ] Install `eslint` v9 and any necessary plugins/parsers for the web project (TypeScript, React, etc.)
- [ ] Create `eslint.config.js` (flat config format) in the web project root
- [ ] Configure recommended rules for TypeScript and React
- [ ] Add `max-lines` rule set to `{ "max": 200 }` with a warning or error severity
- [ ] Add `lint` script to the web project's `package.json`
- [ ] Run ESLint across the codebase and fix or suppress any initial violations
- [ ] Verify the max-lines rule flags files exceeding 200 lines

## Acceptance Criteria

- ESLint 9 is installed and configured with the flat config format (`eslint.config.js`)
- A `max-lines` rule is active that limits files to 200 lines
- `npm run lint` (or equivalent) runs ESLint successfully in the web project
- No unresolved ESLint errors in the codebase (warnings for max-lines on existing files are acceptable initially)
