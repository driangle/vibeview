---
id: "01kz6zyh8"
title: "Make model pricing rates maintainable as they change over time"
status: pending
priority: low
effort: medium
dependencies: ["01kz6qa2p"]
tags: ["backend", "pricing", "cost", "maintainability"]
created_at: 2026-08-04
---

# Make model pricing rates maintainable as they change over time

## Objective

The `pricing` package (`apps/lib/pricing/rates.go`, added in `01kz6qa2p`) hard-codes
per-model Anthropic list prices directly in Go source. Anthropic's rates change over
time (e.g. Opus moved from $15/$75 to $5/$25 on the 4.6+ tier), and new model ids
appear regularly, so a table baked into source silently goes stale and requires a
code change + release to correct. Make the pricing data easy to keep accurate without
editing and recompiling Go logic — the goal is maintainability of the rate *data*, not
a change to how `CostUSD` computes cost.

## Context (file:line)

- `apps/lib/pricing/rates.go` — `modelRates` table + family fallbacks, currently
  hard-coded via `perMillion(...)` calls with a comment citing anthropic.com/pricing.
- `apps/lib/pricing/pricing.go` — `CostUSD(model, usage)` public API (keep unchanged).
- Related: `01kz3q6a5` (estimate cost from tokens) has an acceptance criterion that
  "pricing lives in config, not hard-coded in logic" — coordinate so both converge on
  one source of truth rather than two competing tables.

## Prior art — learn from / reuse `ccusage`

`ccusage` (https://github.com/ryoppippi/ccusage) is a mature open-source CLI for
Claude Code token-usage and cost analysis that already solves the "rates go stale"
problem. Study its approach before designing ours, and reuse what we can:

- It does **not** hard-code prices. It sources per-model pricing from LiteLLM's
  community-maintained `model_prices_and_context_window.json`
  (https://github.com/BerriAI/litellm/blob/main/model_prices_and_context_window.json),
  which is kept current as providers change rates and add models — the same data
  file many tools standardize on.
- It fetches/caches that data (with an offline fallback) rather than fetching live on
  every run, and matches Claude Code model ids against it.
- Investigate: the exact JSON schema (per-token `input_cost_per_token`,
  `output_cost_per_token`, `cache_creation_input_token_cost`,
  `cache_read_input_token_cost`), how ccusage handles unknown models and caching, and
  its licensing so we can reuse the data source (and possibly a vendored snapshot)
  cleanly. Note our `Rates` currently derives cache prices from the input rate via
  multipliers; LiteLLM carries explicit cache costs, so adopting it also removes that
  assumption.

## Approach (pick the simplest that fits)

- **Preferred:** adopt the LiteLLM pricing JSON as the source of truth (as `ccusage`
  does) — vendor a snapshot via `go:embed` for offline/deterministic builds, with an
  optional refresh step to update the snapshot. Map its per-token fields directly onto
  `Rates` (dropping the derived cache multipliers where explicit costs exist).
- Alternatively, externalize our own table to an embedded `rates.json` if the LiteLLM
  data proves a poor fit; keep the Go table only as a typed fallback/default.
- Document a clear update procedure (where the numbers come from, how the snapshot is
  refreshed, how to add a new model id) so refreshing rates is a known, low-risk chore.
- Stamp the data with an "as of" date and surface it wherever cost is shown as an
  estimate, so stale rates are visible rather than silent.
- Out of scope unless justified: fetching live prices on every run (a vendored snapshot
  refreshed periodically, ccusage-style, gets the freshness without the per-run network
  dependency).

## Tasks

- [ ] Review `ccusage` and the LiteLLM pricing JSON: confirm the schema, offline/caching
      strategy, unknown-model handling, and license; decide whether to reuse the data
      source (vendored snapshot) or just borrow the approach.
- [ ] Decide and document the maintenance model (LiteLLM snapshot vs. our own embedded
      data file), keeping a single source of truth shared with `01kz3q6a5`.
- [ ] Externalize the rate data (e.g. `go:embed` a vendored pricing JSON) so updating a
      price is a data/snapshot change, not an edit to `CostUSD` logic; add a refresh step.
- [ ] Record an "as of" date for the rates and expose it where cost is surfaced as
      an estimate (backend value the CLI/web can display).
- [ ] Add the newer Opus 4.6+ tiers ($5/$25) and any missing current model ids while
      here, since the current table uses the classic $15/$75 Opus rate.
- [ ] Tests: rates load from the chosen source; a bad/missing entry still falls back
      predictably (no panic); `CostUSD` output unchanged for existing known models.

## Acceptance Criteria

- The design reuses or is explicitly informed by `ccusage`/LiteLLM pricing data (with a
  short note on why we did or didn't vendor the LiteLLM JSON directly).
- Updating a model's price is a data/config change, not an edit to cost-computation logic.
- The rate data records when it was last verified, and that date is available to surface
  alongside estimated cost.
- Newer Opus (4.6+) pricing is represented correctly rather than the legacy Opus rate.
- Unknown/blank models still fall back predictably without panicking.
- `make check` passes; new behavior is covered by tests.
