---
title: "Build timeline data pipeline (cycle grouping, phase classification, layout engine)"
id: "01kma9qsb"
status: completed
priority: critical
type: feature
tags: ["timeline", "frontend"]
created: "2026-03-22"
---

# Build timeline data pipeline (cycle grouping, phase classification, layout engine)

## Objective

Build the core data processing pipeline that transforms raw session messages into a structured timeline model. This is the foundation all visual components depend on — it groups messages into exchange cycles, classifies each cycle into a semantic phase using tool-call heuristics, and computes layout positions for rendering.

## Tasks

- [x] Create `lib/timeline/buildTimeline.ts` with `groupIntoCycles(messages)` that pairs user prompts with their full assistant response chains (folding in progress/system/file-history-snapshot messages)
- [x] Create `lib/timeline/classifyPhase.ts` implementing priority-ordered heuristic rules: extract tool_use/tool_result blocks, build feature sets (toolNames, hasErrors, fileExtensions, bashCommands, thinkingTokens, textTokens, hasSubagents), classify as Debugging > Testing > DevOps > Configuration > Coding > Research > Planning > Conversation
- [x] Create `lib/timeline/layoutEngine.ts` that computes x/y positions: fixed horizontal slot per cycle, phase regions spanning constituent cycles, nodes centered in slots, subagent offsets
- [x] Derive node properties per cycle: size (token count bucketed S/M/L/XL), badges (error, deep thinking, subagent, approval gate), files touched, cost, duration
- [x] Merge adjacent cycles with same phase into contiguous phase regions
- [x] Export clean `TimelineData` type: `{ cycles: TimelineCycle[], phases: TimelinePhase[], layout: LayoutResult }`

## Acceptance Criteria

- `buildTimeline(messages)` correctly groups messages into exchange cycles
- Phase classification matches spec rules in priority order
- Layout engine produces valid x/y coordinates for all nodes and regions
- All types are well-defined and exported
