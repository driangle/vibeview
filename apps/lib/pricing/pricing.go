// Package pricing computes the USD cost of Claude token usage from a per-model
// rate table. It is the single source of pricing for the codebase; callers that
// need per-exchange or per-model cost derive it from CostUSD rather than
// hard-coding rates.
package pricing

import "github.com/driangle/vibeview/apps/lib/claude"

// CostUSD returns the computed cost in USD for a single message's token usage on
// the given model. Unknown or blank models fall back to family-prefix rates and,
// failing that, the Sonnet family default (see ratesFor) — never a panic.
func CostUSD(model string, usage claude.Usage) float64 {
	r := ratesFor(model)
	return r.Input*float64(usage.InputTokens) +
		r.Output*float64(usage.OutputTokens) +
		r.CacheCreation*float64(usage.CacheCreationInputTokens) +
		r.CacheRead*float64(usage.CacheReadInputTokens)
}
