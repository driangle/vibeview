---
id: "01knxy288"
title: "Split ContributionGraph component (546 lines)"
status: pending
priority: medium
dependencies: []
tags: ["lint", "max-lines", "refactor"]
created: 2026-04-11
---

# Split ContributionGraph component (546 lines)

## Objective

Split `ContributionGraph.tsx` (546 lines) into smaller, focused modules to satisfy the 200-line max-lines lint rule. This is the largest offending file.

## Tasks

- [ ] Analyze `ContributionGraph.tsx` and identify logical sub-components and utilities to extract
- [ ] Extract sub-components (e.g., tooltip, legend, cell rendering) into separate files
- [ ] Extract utility/helper functions (data processing, date calculations) if applicable
- [ ] Verify the main file is under 200 lines

## Acceptance Criteria

- `ContributionGraph.tsx` is under 200 lines
- All extracted files are under 200 lines
- No `max-lines` warning from this component
- Existing behavior and tests pass
