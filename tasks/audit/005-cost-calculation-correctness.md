---
id: "audit-005"
title: "Fix cost calculation accuracy issues"
status: pending
priority: critical
effort: small
type: bug
tags: [data-integrity, backend]
group: audit
touches: ["cli/session", "cli/claude/pricing"]
context:
  - "apps/cli/internal/session/session.go"
  - "apps/cli/internal/claude/pricing.go"
---

# Fix cost calculation accuracy issues

## Findings

### CRITICAL: Cost overwrites accumulated values (session.go:328-342)
`meta.Usage.CostUSD` accumulates from assistant messages, but is unconditionally overwritten by `TotalCostUSD` from a result message. This loses accumulated intermediate costs.

### HIGH: Missing model pricing returns $0 (pricing.go:62-72)
`CalculateCost()` returns 0 for unknown models. New Claude models will silently show $0 cost.

## Acceptance Criteria

- [ ] Decide and document the correct cost semantic (accumulate vs. result-only)
- [ ] Fix the overwrite logic to match the intended behavior
- [ ] Log a warning when a model is not found in pricing data
- [ ] Expose unknown model warnings in the API so the frontend can alert users
- [ ] Add tests for cost calculation with multiple models and missing pricing
