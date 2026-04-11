---
id: "01knxy27c"
title: "Fix react-hooks/exhaustive-deps warnings in contexts and pages"
status: pending
priority: high
dependencies: []
tags: ["lint", "react-hooks"]
created: 2026-04-11
---

# Fix react-hooks/exhaustive-deps warnings in contexts and pages

## Objective

Fix 6 `react-hooks/exhaustive-deps` warnings by wrapping unstable initializations in `useMemo`.

## Tasks

- [ ] `ProjectsContext.tsx:15` — wrap `projects` logical expression in `useMemo` (fixes 3 warnings for useCallback hooks at lines 75, 85, 92)
- [ ] `SettingsContext.tsx:12` — wrap `settings` object initialization in `useMemo` (fixes 1 warning for useCallback at line 37)
- [ ] `SessionList.tsx:178` — wrap `displaySessions` conditional in `useMemo` (fixes 2 warnings for useMemo hooks at lines 186, 190)

## Acceptance Criteria

- All 6 `react-hooks/exhaustive-deps` warnings are resolved
- No new warnings introduced
- Existing behavior is preserved (verify with existing tests)
