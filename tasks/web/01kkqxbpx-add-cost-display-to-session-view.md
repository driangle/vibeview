---
title: "Add cost display to session view"
id: "01kkqxbpx"
status: completed
priority: medium
effort: small
type: feature
tags: ["frontend", "ui", "cost"]
phase: "polish"
dependencies: ["01kkqxa68", "01kkqx7ky"]
created: "2026-03-15"
---

# Add cost display to session view

## Objective

Display token usage and estimated dollar costs in the session view. Show a sidebar or header with total input/output/cache tokens and calculated costs based on the model's pricing tier.

## Tasks

- [x] Define TypeScript types for usage/cost data from API
- [x] Build cost display component (sidebar or header section)
- [x] Show raw token counts: input, output, cache read, cache creation
- [x] Show estimated dollar cost based on model pricing
- [x] Format costs as currency with appropriate precision
- [x] Style with Tailwind CSS to be visually informative but not dominant

## Acceptance Criteria

- Token counts displayed for input, output, cache read, and cache creation
- Dollar cost estimate shown based on session's model
- Cost updates when new messages arrive via SSE
- Readable formatting (e.g., "1.2M tokens", "$3.45")
