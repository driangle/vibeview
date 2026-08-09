# Cost display — current state

**Status: disabled by default** (as of 2026-08-09), in both the web UI and the
CLI, gated by a single runtime env var.

Cost figures are hidden while token→cost estimation is reworked for accuracy. A
single environment variable — **`VIBEVIEW_COST_ENABLED`** — controls both the web
UI and the CLI in lockstep, so cost can be turned back on at runtime with no
rebuild. This document explains why, what is and isn't in place, and how to
re-enable.

## Why it's disabled

vibeview has two possible sources of session cost, and neither is currently good
enough to show a trustworthy number for every session:

1. **Authoritative cost** — `total_cost_usd` on a session's `result` message (and
   the per-message `costUSD` field). This is accurate, but it is present almost
   exclusively on **programmatic / SDK** sessions. Interactive sessions carry
   per-message token `usage` with **no cost**, so authoritative cost is missing
   for the majority of sessions.

2. **Estimated cost** — tokens × a model pricing table
   (`apps/lib/pricing`). This fills the gap for interactive sessions, but the
   estimate is only as good as the table, and getting it right is harder than it
   looks:
   - **Pricing drift** — list prices change and new models appear; a bundled
     table goes stale between releases.
   - **Tiered / long-context pricing** — e.g. Sonnet charges a higher rate above
     a 200K-token context; a flat per-token rate over-/under-counts.
   - **Cache pricing nuance** — cache-write vs cache-read multipliers, and
     multiple cache TTLs, are approximated.
   - **Authoritative vs estimated** — a mixed view (some sessions exact, some
     estimated) needs clear per-figure labeling to avoid implying false
     precision.

Rather than ship cost numbers that look exact but aren't, the display is turned
off until the estimation story is solid.

## What is still in place (nothing was ripped out)

All the plumbing remains, so re-enabling is a one-line flip:

- `apps/lib/pricing` — the model rate table (`rates.go`) and `CostUSD()` still
  compute cost. Unchanged.
- The **timeline** still computes per-exchange and per-model cost
  (`apps/lib/timeline`), and the API still serializes every `costUSD` field.
- Session cost is still populated from authoritative `total_cost_usd` during
  enrichment (`apps/lib/session`).
- The web TypeScript types still carry their `costUSD` fields.

## What is disabled

Every **human-facing** cost ($) figure, gated by one env var,
`VIBEVIEW_COST_ENABLED` (default off):

- The single source of truth is `apps/cli/internal/features/features.go` →
  `CostUIEnabled()`, which reads the env var.
- The web UI reads it via `/api/config` (`ConfigResponse.CostEnabled`) through the
  `useCostUIEnabled()` hook (`apps/web/src/hooks/useCostUIEnabled.ts`), so the web
  hides/shows cost in lockstep with the CLI — no rebuild.

Gated **web** render sites:

- Session list column + "Total Cost" summary card (`SessionTable.tsx`,
  `SessionRow.tsx`, `pages/SessionList.tsx`).
- Session view header cost stat (`SessionViewHeader.tsx`).
- Timeline exchange detail cost tile (`timeline-track/ExchangeSummary.tsx`).
- Insights → Models per-model cost (`insights/sections/ModelsSection.tsx`).

Gated **CLI** render sites (human-readable output only):

- `vibeview stats` styled summary (`stats.go`).
- `vibeview sessions` table COST column (`sessions.go`).
- `vibeview related` table COST column (`related.go`).

**Machine-readable output is unaffected:** `--json` / `--yaml` still carry
authoritative `total_cost_usd` where a session has it (that value is never
estimated — just sparse, present mostly on programmatic sessions). Only the
human-facing tables and summaries hide cost.

## How to re-enable

Set the env var when launching vibeview — no rebuild:

```sh
VIBEVIEW_COST_ENABLED=1 vibeview            # web server + all CLI output
VIBEVIEW_COST_ENABLED=1 vibeview stats
export VIBEVIEW_COST_ENABLED=1              # for the whole shell session
```

Every gated figure returns. Do this only once the accuracy work below lands.

## Path to re-enabling (what a future task must solve)

- A dependable pricing source (e.g. adopt LiteLLM's
  `model_prices_and_context_window.json` shape, bundled offline with optional
  refresh — see the discussion around task `01kz3q6a5`).
- Long-context / tiered pricing handled, not flattened.
- A single costing entry point that reconciles authoritative vs estimated and
  returns an `estimated` flag, so the UI can label estimates as such.
- Tests: known tokens × known rates → expected cost; authoritative wins over
  estimate; unknown model degrades gracefully.

Tracked by task `01kz3q6a5` (Estimate cost from tokens using a model pricing
table), currently **blocked** pending the accuracy work above.
