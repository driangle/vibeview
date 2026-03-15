---
title: "Render hookEvent messages with dedicated hook UX instead of generic Progress"
id: "01kks2wyd"
status: in-progress
priority: medium
type: feature
tags: ["ui", "messages"]
created: "2026-03-15"
---

# Render hookEvent messages with dedicated hook UX instead of generic Progress

## Objective

`hookEvent` messages currently render as generic "Progress" bubbles in the session view (see `MessageBubble.tsx:94`). They should have a distinct visual treatment that identifies them as hook executions — e.g. a "Hook" label, a hook-specific icon, and potentially showing the hook name/status.

## Tasks

- [ ] Add `"hook"` to the `Message.type` union in `types.ts` (or use a subtype/field on progress messages)
- [ ] Detect hookEvent messages during parsing and tag them with the new type
- [ ] Create a dedicated rendering path in `MessageBubble.tsx` for hook messages (label, icon, styling)
- [ ] Display hook-specific details (hook name, pass/fail status) when available

## Acceptance Criteria

- hookEvent messages render with a "Hook" label instead of "Progress"
- Hook messages are visually distinguishable from generic progress messages
- Hook name and outcome are displayed when present in the message data
- Non-hook progress messages continue to render as before
