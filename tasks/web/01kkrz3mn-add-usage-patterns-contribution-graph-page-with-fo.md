---
title: "Add usage patterns contribution graph page with folder filtering"
id: "01kkrz3mn"
status: pending
priority: medium
type: feature
tags: ["ui", "analytics", "visualization"]
created: "2026-03-15"
---

# Add usage patterns contribution graph page with folder filtering

## Objective

Add a page/section to the site that visualizes usage patterns over time using a contribution graph (similar to GitHub's contribution heatmap). Users should be able to view activity across different time spans (days, weeks, months) and filter by folder to drill into specific areas of the codebase.

## Tasks

- [ ] Design the data model and API endpoint for aggregated usage data (activity counts per day, grouped by folder)
- [ ] Build the contribution graph component with a calendar heatmap layout (cells colored by activity intensity)
- [ ] Add time range selector to toggle between day, week, and month views
- [ ] Add folder filter dropdown/picker to narrow the graph to a specific directory
- [ ] Create the usage patterns page and integrate it into the site navigation
- [ ] Add hover tooltips showing date and activity count for each cell
- [ ] Add a color legend indicating activity intensity levels

## Acceptance Criteria

- A dedicated page/section displays a contribution-style heatmap of usage patterns
- The graph supports viewing data at day, week, and month granularity
- Users can filter by folder to see usage for a specific directory
- Hovering over a cell shows the date and activity count
- The graph renders correctly with empty data, sparse data, and dense data
- The page is accessible from the site navigation
