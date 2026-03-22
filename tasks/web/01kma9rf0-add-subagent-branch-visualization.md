---
title: "Add subagent branch visualization"
id: "01kma9rf0"
status: pending
priority: medium
type: feature
tags: ["timeline", "frontend"]
created: "2026-03-22"
dependencies: ["01kma9qsb", "01kma9rbb", "01kma9rd3"]
---

# Add subagent branch visualization

## Objective

When `Agent` tool calls spawn subagent work, the timeline path should visually fork downward and merge back — showing parallel workstreams. This makes subagent activity visible as a structural element of the conversation flow rather than hidden inside a single node.

## Tasks

- [ ] Create `components/timeline/TimelineSubagentBranch.tsx` — renders forking/merging bezier curves from the parent node to a secondary lane
- [ ] Detect Agent tool calls in exchange cycles and extract subagent groupings (using existing `agentGroups` from `useSessionData`)
- [ ] Position subagent branches offset downward from the main path
- [ ] Render subagent nodes (smaller, secondary style) along the branch
- [ ] Draw merge-back curve from last subagent node returning to the main path
- [ ] Handle multiple concurrent subagents by stacking branches vertically

## Acceptance Criteria

- Cycles with Agent tool calls show a visible fork in the timeline path
- Subagent branches are spatially distinct from the main path
- Branch start/end points connect smoothly to the main path via bezier curves
- Multiple subagent branches within a single cycle don't overlap
