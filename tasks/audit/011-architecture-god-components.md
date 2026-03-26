---
id: "audit-011"
title: "Refactor god components and improve separation of concerns"
status: completed
priority: high
effort: large
type: improvement
tags: [architecture, frontend]
group: audit
touches: ["web/pages/SessionView", "web/pages/SessionList", "web/components/SessionInsights", "web/components/ContributionGraph", "web/components/processMessageContent"]
context:
  - "apps/web/src/pages/SessionView.tsx"
  - "apps/web/src/pages/SessionList.tsx"
  - "apps/web/src/components/SessionInsights.tsx"
  - "apps/web/src/components/ContributionGraph.tsx"
  - "apps/web/src/components/processMessageContent.ts"
  - "apps/web/src/components/MessageContent.tsx"
---

# Refactor god components and improve separation of concerns

## Findings

### HIGH: God components
- SessionView.tsx: 571 LOC — combines pagination, timeline, sidebar, search, print mode, activity state
- SessionList.tsx: 484 LOC — combines filtering, sorting, pagination, rendering
- ContributionGraph.tsx: 545 LOC — should be split into data processing + rendering
- SessionInsights.tsx: 369 LOC — handles extraction + rendering

### HIGH: Parser/UI separation violation
`processMessageContent.ts` lives in components/ but is a parser. `SEGMENT_RENDERERS` in MessageContent.tsx is tightly coupled to types.

### MEDIUM: Weak error extraction (extractors/errors/fromToolResults.ts:5-28)
Errors truncated to 200 chars, no classification.

### MEDIUM: TypeScript Record<string, unknown> overuse
Multiple files use untyped records without specific field requirements.

## Acceptance Criteria

- [x] Split SessionView into SessionViewLayout, MessageCanvas, MessagePaginator, SessionSidebar
- [x] Split SessionList into list container + filter/sort components
- [x] Move processMessageContent.ts to lib/parsers/
- [x] Decouple segment renderers from type definitions
- [x] Add branded types for ContentBlockInput instead of Record<string, unknown>
