---
id: "01kz43hh5"
title: "Add Memory Explorer web page"
status: pending
priority: medium
effort: medium
type: feature
phase: memory-explorer
dependencies: ["01kz43hg5"]
tags: [web, memory-explorer]
context: ["apps/web/src/App.tsx", "apps/web/src/pages/UsagePatterns.tsx", "apps/web/src/pages/Settings.tsx"]
created_at: 2026-08-03
verify:
  - type: bash
    run: "cd apps/web && npm run lint && npm run build"
---

# Add Memory Explorer web page

## Objective

Add a `/memory` page to the web UI that lets users browse, search, and understand
Claude's auto-memory and `CLAUDE.md` instruction files. The page is a thin display
layer over `/api/memory` — no parsing or classification in the frontend.

## Context / Findings

- Pages are React components in `apps/web/src/pages/`, wired into `<Routes>` in
  `apps/web/src/App.tsx`, with nav wiring alongside `/activity`, `/projects`, etc.
- The API returns projects, entries (with `type`, description, body, resolved and
  dangling `[[links]]`), and instruction files — see task `01kz43hg5`.
- `UsagePatterns.tsx` is a good reference for a data-fetching analytics page; the
  navbar/nav pattern lives with the shared layout components.
- Dark mode is supported project-wide — the page must respect it.

## Tasks

- [ ] Create `apps/web/src/pages/MemoryExplorer.tsx` and add a `/memory` route plus a
      nav entry.
- [ ] List view: memory grouped by project, with a filter by `type`
      (user / feedback / project / reference) and a search box that hits the API's
      `?q=`/`?type=` params.
- [ ] Detail view: selecting an entry shows its rendered markdown body plus its raw
      frontmatter (name / description / type). Render `[[name]]` cross-links as
      clickable navigation to the referenced entry; show dangling links as inert/muted.
- [ ] Clearly separate the two kinds of memory in the UI: auto-memory as the primary
      section, and `CLAUDE.md` instruction files (global + project) in a distinct,
      labeled section — do not blend them.
- [ ] Use the shared inline event/preview styling conventions where appropriate;
      keep system-like content compact per the project UX rule.
- [ ] Handle empty states (project with only `MEMORY.md`, no memory at all) and
      loading/error states.
- [ ] Component/render tests for the list, the type filter, and cross-link navigation.

## Acceptance Criteria

- `cd apps/web && npm run lint && npm run build` passes.
- `/memory` lists memory grouped by project with working type filter and search.
- Selecting an entry renders its body + frontmatter; `[[links]]` navigate to
  referenced entries and dangling links are visibly inert.
- Auto-memory and `CLAUDE.md` instruction files are shown as clearly distinct
  sections.
- Empty/loading/error states are handled; dark mode is respected.
