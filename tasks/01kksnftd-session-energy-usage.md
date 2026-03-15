---
title: "Show estimated energy usage per session"
id: "01kksnftd"
status: pending
priority: low
type: feature
tags: ["sessions", "sustainability"]
created: "2026-03-15"
---

# Show estimated energy usage per session

## Objective

Display estimated energy consumption (in watt-hours) per session based on real, published data about LLM inference energy costs. The estimates should be grounded in credible sources (e.g. IEA reports, published ML energy benchmarks, or Anthropic disclosures) and derived from the token counts already tracked per session.

## Research Notes

Energy estimation should be based on tokens processed, since energy scales roughly with compute (FLOPs), which correlates with token count.

### Sources

- **arXiv:2505.09598** — energy consumption analysis for LLM inference
- **arXiv:2509.08867** — energy per token benchmarks

### Additional references

- Published benchmarks like the IEA's estimate of ~0.3 Wh per ChatGPT query (as a reference point)
- Any Anthropic-published figures on energy per request or per token

The estimate does not need to be exact but must cite its methodology and sources.

## Tasks

- [ ] Research and document credible energy-per-token estimates for Claude model tiers (Opus, Sonnet, Haiku), citing sources
- [ ] Add energy estimation config (Wh per million tokens by model) to the pricing/config JSON
- [ ] Implement energy calculation in the backend using token counts and model-specific energy factors
- [ ] Add `estimatedEnergyWh` field to the session API response
- [ ] Display estimated energy usage in the session detail view with a tooltip explaining the methodology
- [ ] Optionally show aggregate energy usage in the session list (e.g. as a column or summary stat)

## Acceptance Criteria

- Each session displays an estimated energy consumption in Wh, derived from its token usage and model
- Energy factors are based on published, citable data (not arbitrary numbers)
- The methodology and sources are documented and accessible to the user (e.g. via tooltip or info link)
- Different model tiers (Opus, Sonnet, Haiku) use different energy factors reflecting their relative compute costs
- The estimate updates as new messages are added to a session
