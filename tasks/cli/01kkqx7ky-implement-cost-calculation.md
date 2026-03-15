---
title: "Implement cost calculation"
id: "01kkqx7ky"
status: pending
priority: medium
effort: small
type: feature
tags: ["backend", "cost"]
phase: "core"
dependencies: ["01kkqx2e3"]
created: "2026-03-15"
---

# Implement cost calculation

## Objective

Implement token cost calculation logic with hardcoded per-model pricing. Calculate both raw token counts and estimated dollar costs for sessions, including cache read and cache creation token pricing.

## Tasks

- [ ] Define pricing config struct with per-model rates (input, output per 1M tokens)
- [ ] Add hardcoded pricing: claude-opus-4-6 ($15/$75), claude-sonnet-4-6 ($3/$15), claude-haiku-4-5 ($0.80/$4)
- [ ] Implement cache pricing: cache read at 10% of input, cache creation at 25% of input
- [ ] Calculate per-session totals: sum input_tokens, output_tokens, cache_read, cache_creation across all assistant messages
- [ ] Convert token counts to dollar costs
- [ ] Expose cost data in session API responses
- [ ] Write unit tests for cost calculations

## Acceptance Criteria

- Costs calculated correctly for all three model tiers
- Cache read and creation tokens priced at correct ratios
- Session total aggregates all assistant message usage data
- API responses include both raw token counts and dollar cost estimates
