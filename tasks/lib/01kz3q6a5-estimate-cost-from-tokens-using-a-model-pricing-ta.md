---
title: "Estimate cost from tokens using a model pricing table"
id: "01kz3q6a5"
status: pending
priority: medium
type: feature
phase: "usage-improvements"
dependencies: ["01kz3q60q"]
tags: ["usage", "analytics", "cost", "backend"]
created: "2026-08-03"
parent: 01kz3q22m
---

# Estimate cost from tokens using a model pricing table

## Objective

Provide accurate cost figures for interactive sessions. Today cost is only trusted
from `result.total_cost_usd`, which is present mainly on programmatic sessions;
interactive sessions carry per-message `usage` with no cost. Add a model→pricing
table and compute estimated cost from tokens × rate where an authoritative cost is
absent, clearly labeled as an estimate.

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
- [ ] Wire estimated cost into `vibeview usage` and `stats`.
- [ ] Tests: known tokens × known rates → expected cost; authoritative cost wins
      over estimate.

## Acceptance Criteria

- Interactive sessions show an estimated cost derived from tokens × model pricing.
- Authoritative `total_cost_usd` is used when present; derived cost is labeled
  estimated.
- Pricing lives in config, not hard-coded in logic.
- New behavior covered by tests; `make check` passes.

## Notes

- Optional / lowest priority in the phase — can ship after phases 1–4. Verify no
  duplicate pricing config already exists (`01kkqx7ky`) and extend it if so.
