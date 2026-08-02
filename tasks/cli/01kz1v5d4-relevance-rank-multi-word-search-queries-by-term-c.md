---
title: "Relevance-rank multi-word search queries by term coverage"
id: "01kz1v5d4"
status: completed
priority: high
type: feature
tags: ["search", "ranking"]
created: "2026-08-02"
---

# Relevance-rank multi-word search queries by term coverage

## Objective

Fix over-constrained multi-word content search. The search engine matched the
entire query as a single literal substring, so a query like
`refactor review cli` only matched when those three words appeared adjacent in
one message — behaving like phrase/proximity matching rather than relevance
search. The most natural search (a few topical keywords) returned zero hits even
when every word appeared many times in a session.

Treat a bare multi-word query as independent terms and rank sessions by term
coverage (how many distinct query words they contain) then frequency. Reserve
phrase/proximity matching for quoted input (`"exact phrase"`).

## Tasks

- [x] Add `parseQuery` to split a bare query into independent lowercased terms on
      whitespace, keeping a double-quoted span as a single phrase term
      (`apps/lib/search/query.go`).
- [x] Rework `searchFile` to score each term separately, tracking coverage
      (distinct terms present) alongside the weighted frequency score; a session
      matches if it contains any term.
- [x] Rank results by coverage → weighted score → newest-first order.
- [x] Return no results for empty/whitespace-only queries.
- [x] Center the snippet on the first matching term, still preferring the
      highest-weight field.
- [x] Update the `search` CLI help text to document keyword-vs-quoted-phrase
      semantics (`apps/cli/cmd/vibeview/main.go`).
- [x] Add tests: non-adjacent terms match, coverage beats raw frequency, quoted
      phrase requires adjacency, empty query returns nothing, and a table-driven
      `parseQuery` test.

## Acceptance Criteria

- `search "refactor review cli"` returns sessions containing all three words,
  ranked with the session covering all terms (and highest frequency) first.
- A session containing every query term outranks one that repeats a subset,
  regardless of raw occurrence count.
- `search '"refactor review cli"'` (quoted) matches only sessions where the words
  are adjacent.
- Single-word queries behave identically to before.
- Empty or whitespace-only queries return no results.
- The web API (`GET /api/search`) inherits the same behavior with no frontend
  change, since it calls `search.Search`.
- `make check` passes (lint, cli tests, web tests, docs build) and the
  `apps/lib/search` package tests pass.
