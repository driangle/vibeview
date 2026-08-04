---
id: "01kz6qas9"
title: "Timeline: filter chips, search, and keyboard navigation (web)"
status: pending
priority: medium
effort: medium
phase: timeline
dependencies: ["01kz6qas3"]
tags: ["frontend", "timeline", "web"]
created_at: 2026-08-04
---

# Timeline: filter chips, search, and keyboard navigation (web)

## Objective

Add the toolbar controls that make the track navigable: filter chips (Errors, Subagents,
Thinking, Approvals, Skills), a session search box with a match counter and prev/next, a
shown-count label, and keyboard navigation (j/k move, e next error, ↵ open, Esc clear).

## Design reference

`~/Downloads/Timeline view design directions-handoff.zip` → `.../Timeline Track.dc.html`
(the toolbar with the five colored chips + counts, the `shownLabel`, the keyboard-hint
legend `j k move · e next error · ↵ open`, and the header search input with match
counter/up-down/clear; the filtering/counter logic is in its `renderVals()`).

## Context

- Filtering/search operate on the server-provided `Exchange[]` (fields: flags, tools,
  files, commands, skills, prompt, model). Keep it a pure filter over that array.
- Chips toggle boolean filters; multiple active filters are OR-combined per flag, matching
  the mock (`anyFilter && !(...)`). Search matches prompt/tools/files/model/commands/skills.
- Keyboard: `j`/`k` (and arrows) move selection through the filtered list; `e` jumps to the
  next error exchange; `↵` opens the detail panel; `Esc` clears the search when focused.
  Ignore keys while typing in the search input (except Esc).
- The empty-state reset link from [[01kz6qas3]] clears filters + search here.

## Tasks

- [ ] Build the toolbar: five filter chips with live counts and active styling, search box
      with match counter + prev/next + clear, and the shown/total label.
- [ ] Implement the pure filter + search over `Exchange[]`; feed the result to the track.
- [ ] Add keyboard navigation (j/k/arrows/e/↵/Esc) scoped to the Timeline tab; clean up
      listeners on unmount.
- [ ] Vitest: chip toggles filter the list; search narrows + counts; `e` selects the next
      error; reset clears everything.

## Acceptance Criteria

- Chips and search correctly narrow the visible exchanges with accurate counts.
- Keyboard shortcuts move selection / jump to errors / open detail / clear search.
- `npm run typeCheck && npm run lint && npm test` pass in `apps/web`.
