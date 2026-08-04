---
id: "01kz6qa2p"
title: "Timeline: model pricing table and cost helper (Go)"
status: completed
priority: high
effort: small
phase: timeline
dependencies: []
tags: ["backend", "timeline", "go"]
created_at: 2026-08-04
completed_at: 2026-08-04
---

# Timeline: model pricing table and cost helper (Go)

## Objective

The Timeline Track view shows per-exchange and per-model **cost**, but the Go codebase
never computes cost from tokens — there is no pricing table anywhere, and `CostUSD` only
gets set from a `result` message's `total_cost_usd` (absent in most interactive sessions).
Add a small, well-tested pricing table and a cost helper that the exchange/insights
aggregation (tasks that depend on this one) can call.

## Design reference

Cost appears in the design as the per-exchange `$X.XX` stat and the per-model
`… · $X.XX` meta line. Source: `~/Downloads/Timeline view design directions-handoff.zip`
→ `timeline-view-design-directions/project/Timeline Track.dc.html` (see the `rate(id)` and
`costLabel`/`modelRows.meta` logic in its script for the intended shape). The mock's rates
are illustrative only — use realistic Anthropic per-token rates.

## Context

- No pricing exists today (verified). Cost is only read from `result.total_cost_usd`
  (`apps/lib/session/session.go` enrichment, ~line 476).
- Per-message tokens live on `claude.Usage` (`apps/lib/claude/claude.go:251`):
  `input_tokens`, `output_tokens`, `cache_creation_input_tokens`, `cache_read_input_tokens`.

## Tasks

- [x] Add a `pricing` package (e.g. `apps/lib/pricing/pricing.go`) with a table mapping
      model id → per-token rates (input, output, and cache-read/creation if modeled).
- [x] Provide `CostUSD(model string, usage claude.Usage) float64` (and/or a tokens-based
      variant) that returns the computed cost, with a sensible fallback for unknown models
      (match by family prefix e.g. `opus`/`sonnet`/`haiku`; document the fallback).
- [x] Keep the table in one obvious place so rates are easy to update; cite the source of
      the rates in a comment.
- [x] Table-driven tests: known models, family-prefix fallback, unknown model, zero usage.

## Acceptance Criteria

- A pricing helper computes a non-zero cost for a normal assistant `Usage` on known models.
- Unknown/blank models fall back predictably (documented) rather than panicking.
- `go test ./...` passes for the new package; `make check-lite` stays green.
- No behavior change to existing session cost fields yet (this task only adds the helper).
