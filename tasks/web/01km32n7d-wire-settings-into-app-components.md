---
id: "01km32n7d"
title: "Wire settings into app components"
status: completed
priority: medium
effort: medium
type: feature
parent: "01kkzsea9"
dependencies: ["01km32n1x", "01km32n4d"]
tags: ["settings", "ui", "frontend"]
created: 2026-03-19
---

# Wire settings into app components

## Objective

Replace hardcoded defaults and localStorage-based preferences with values from the persistent settings API across all relevant components. Settings should be fetched once at app startup and made available via a React context.

## Tasks

- [ ] Create `SettingsContext` and `SettingsProvider` to fetch and cache settings at app level
- [ ] Wire **theme** — replace `useTheme.ts` localStorage logic with settings value, keep runtime toggle that saves back
- [ ] Wire **defaultSort** — use settings values as initial sort in `SessionList.tsx` instead of localStorage
- [ ] Wire **pageSize** — replace `PAGE_SIZE = 100` constant in `SessionList.tsx` with settings value
- [ ] Wire **dateFormat** — add absolute date formatting option in `SessionRow.tsx` `formatSessionDate()`
- [ ] Wire **autoFollow** — use settings default in `SessionView.tsx` instead of hardcoded `false`
- [ ] Wire **refreshInterval** — replace hardcoded `5000` in SWR config with settings value
- [ ] Wire **showCost** — conditionally show/hide cost column in `SessionList.tsx` and `CostDisplay` in `SessionView`
- [ ] Wire **customModelPricing** — send overrides to backend or apply on frontend cost calculations
- [ ] Wire **messagesPerPage** — replace `MESSAGES_PER_PAGE = 100` in `SessionView.tsx` with settings value

## Acceptance Criteria

- All 10 settings affect their respective UI behaviors when changed
- App works correctly with default settings (no settings file on disk)
- Theme, sort, auto-follow, and other localStorage-based values migrate to use settings API
- No regressions in existing functionality when settings are at their default values
