---
title: "Fix all linting warnings"
id: "01kn3m735"
status: pending
priority: medium
type: chore
tags: ["lint", "cleanup"]
created: "2026-04-01"
---

# Fix all linting warnings

## Objective

Resolve all 23 ESLint warnings in the web app to achieve a clean lint output. Warnings fall into three categories: files exceeding the 200-line max (`max-lines`), unused `eslint-disable` directives, and `react-hooks/exhaustive-deps` violations from unstable references.

## Tasks

### File splitting (max-lines warnings — 15 files)
- [ ] Split `ContributionGraph.tsx` (546 lines)
- [ ] Split `DateRangeFilter.tsx` (422 lines)
- [ ] Split `SessionList.tsx` (380 lines)
- [ ] Split `SessionInsights.tsx` (369 lines)
- [ ] Split `Settings.tsx` (367 lines)
- [ ] Split `SessionView.tsx` (344 lines)
- [ ] Split `NavBar.tsx` (335 lines)
- [ ] Split `MessageBubble.tsx` (319 lines)
- [ ] Split `ConversationSearch.tsx` (292 lines)
- [ ] Split `buildTimeline.ts` (259 lines)
- [ ] Split `useProjects.test.ts` (236 lines)
- [ ] Split `FileViewer.tsx` (235 lines)
- [ ] Split `TimelineToolLane.tsx` (220 lines)
- [ ] Split `TimelineNode.tsx` (214 lines)
- [ ] Split `SessionTimeline.tsx` (204 lines)

### Remove unused eslint-disable directives (2 warnings)
- [ ] Remove unused `eslint-disable` in `DateRangeFilter.tsx:271`
- [ ] Remove unused `eslint-disable` in `SessionTimeline.tsx:77`

### Fix react-hooks/exhaustive-deps warnings (6 warnings)
- [ ] Wrap `projects` in `useMemo` in `ProjectsContext.tsx`
- [ ] Wrap `settings` in `useMemo` in `SettingsContext.tsx`
- [ ] Wrap `displaySessions` in `useMemo` in `SessionList.tsx`

## Acceptance Criteria

- `make lint` produces 0 warnings and 0 errors
- All existing tests continue to pass (`make check`)
- No behavioral regressions in the UI
