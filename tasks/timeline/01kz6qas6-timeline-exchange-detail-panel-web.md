---
id: "01kz6qas6"
title: "Timeline: exchange detail panel (web)"
status: pending
priority: medium
effort: medium
phase: timeline
dependencies: ["01kz6qas3"]
tags: ["frontend", "timeline", "web"]
created_at: 2026-08-04
---

# Timeline: exchange detail panel (web)

## Objective

Build the right-hand detail panel that shows the selected exchange: header (number, clock,
duration, model pill, prev/next/close), a summary block (prompt, stat tiles, badges,
commands, files-touched), the inline messages, and a footer ("Open in conversation",
"Raw JSON").

## Design reference

`~/Downloads/Timeline view design directions-handoff.zip` → `.../Timeline Track.dc.html`
(the `detail` section: `Exchange {num}`, three stat tiles elapsed/tokens/cost, badge pills,
"Commands run", "Files touched" with +/− churn, then the Messages block with user bubble /
thinking / tool calls / assistant, and the footer buttons).

## Context

- Reuse existing content components rather than rebuilding: `MessageBubble.tsx`,
  `ToolCallBlock.tsx`, `ThinkingBlock.tsx`, `EditDiffBlock.tsx`, `FilesTouched.tsx`
  (see how the old `TimelineDetailPanel.tsx` composed `MessageBubble`).
- The panel resolves its messages from the selected exchange's `messageUuids` against the
  session messages already in `SessionView`.
- "Open in conversation" switches to the Conversation tab (tab state from [[01kz6qas1]]);
  jumping to the exact exchange in the conversation is best-effort.
- Reuse `formatCost`, `formatTokenCount`, shared duration formatter; model pill from
  `ModelBadge.tsx`.

## Tasks

- [ ] Build the detail panel component with header, summary tiles, badges, commands,
      files-touched, inline messages, and footer.
- [ ] Wire prev/next to move selection through the (filtered) exchange list; close clears
      selection; keyboard prev/next integrates with [[01kz6qas9]].
- [ ] "Open in conversation" switches tabs; "Raw JSON" reveals the raw exchange/messages.
- [ ] Vitest: renders selected exchange fields; prev/next changes selection; messages
      resolve from `messageUuids`.

## Acceptance Criteria

- Selecting a track row populates the panel with that exchange's data and messages.
- Prev/next/close behave per the mock; "Open in conversation" switches to the untouched
  Conversation tab.
- `npm run typeCheck && npm run lint && npm test` pass in `apps/web`.
