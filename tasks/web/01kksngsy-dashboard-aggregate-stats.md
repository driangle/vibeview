---
title: "Dashboard page with aggregate stats"
id: "01kksngsy"
status: pending
priority: medium
type: feature
tags: ["dashboard", "analytics"]
dependencies: ["01kksnftd"]
created: "2026-03-15"
---

# Dashboard page with aggregate stats

## Objective

Add a dedicated dashboard page that shows aggregate usage statistics across all sessions. The dashboard should display totals and breakdowns by project/directory and by model for: session count, token usage, cost, and estimated energy consumption.

## Tasks

- [ ] Add a `/api/stats` API endpoint that returns aggregate metrics (total sessions, tokens, cost, energy) with breakdowns by project and by model
- [ ] Create a new `/dashboard` route and `Dashboard` page component
- [ ] Add a top-level summary section showing totals: sessions, input/output tokens, cost, estimated energy
- [ ] Add a "By Project" breakdown table/section showing per-project totals for sessions, tokens, cost, energy
- [ ] Add a "By Model" breakdown table/section showing per-model totals for sessions, tokens, cost, energy
- [ ] Add navigation link to the dashboard from the main layout/header
- [ ] Support date range filtering on the dashboard (reuse the date range filter component if available)

## Acceptance Criteria

- A dashboard page is accessible via navigation from the main layout
- The dashboard shows total session count, total input/output tokens, total cost, and total estimated energy
- A "By Project" section breaks down all metrics grouped by project directory
- A "By Model" section breaks down all metrics grouped by model name
- All numbers are formatted for readability (e.g. 1.2M tokens, $42.50)
- The dashboard loads efficiently even with many sessions (aggregation happens server-side)
