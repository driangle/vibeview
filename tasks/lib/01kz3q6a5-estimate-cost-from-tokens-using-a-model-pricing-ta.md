---
title: "Estimate cost from tokens using a model pricing table"
id: "01kz3q6a5"
status: pending
priority: critical
type: feature
phase: "usage-improvements"
dependencies: ["01kz3q60q"]
tags: ["usage", "analytics", "cost", "backend"]
created: "2026-08-03"
parent: 01kz3q22m
---

# Estimate cost from tokens using a model pricing table

## Objective

Establish a single, accurate source of cost for every session — the foundation the
rest of the usage phase builds on. Today cost is only trusted from
`result.total_cost_usd`, which is present mainly on programmatic sessions;
interactive sessions carry per-message `usage` with no cost, so any usage view
built before this lands would report cost as zero or missing for most sessions.
Add a model→pricing table and compute cost from tokens × rate where an
authoritative cost is absent, clearly labeled as an estimate.

**Do this first.** The `usage` CLI (`01kz3q6a3`), the attribution rollups
(`01kz3q6a4`), and the web Usage page (`01kz3q7hb`) all surface cost alongside
tokens; they depend on this task so they consume one shared costing function
instead of each inventing its own.

## Context (file:line)

- `apps/lib/session/session.go:476-477`, `:762-763` — cost taken from
  `result.total_cost_usd` only.
- `apps/lib/claude/claude.go:122` — `Message.TotalCostUSD`.
- `apps/cli/cmd/vibeview/stats.go:206-209` — cost totaling in stats.
- Existing precedent: `tasks/cli/01kkqx7ky-implement-cost-calculation.md` — check
  whether a pricing config already exists before adding a new one.

## Tasks

- [ ] Add a model→pricing config (input / output / cache-creation / cache-read
      rates per model tier: Opus, Sonnet, Haiku, and any others seen).
- [ ] Compute estimated cost from token counts × model rate where
      `total_cost_usd` is absent; prefer authoritative cost when present.
- [ ] Flag derived cost as **estimated** wherever surfaced (CLI + web).
- [ ] Expose a single costing entry point (tokens + model → cost, with an
      `estimated` flag) that the CLI, server, and web all consume — no per-caller
      cost math.
- [ ] Wire cost into `stats` (and into `vibeview usage` when that command lands).
- [ ] Tests: known tokens × known rates → expected cost; authoritative cost wins
      over estimate; unknown model degrades gracefully rather than reporting 0.

## Acceptance Criteria

- Interactive sessions show an estimated cost derived from tokens × model pricing.
- Authoritative `total_cost_usd` is used when present; derived cost is labeled
  estimated.
- Pricing lives in config, not hard-coded in logic.
- One costing function serves CLI, server, and web; downstream tasks do not
  recompute cost themselves.
- New behavior covered by tests; `make check` passes.

## Notes

- First task in the phase after the lib foundation (`01kz3q60q`, completed).
  `01kz3q6a3`, `01kz3q6a4`, and `01kz3q7hb` depend on it.
- Verify no duplicate pricing config already exists (`01kkqx7ky`) and extend it if so.
