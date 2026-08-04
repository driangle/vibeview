package pricing

import (
	"math"
	"testing"

	"github.com/driangle/vibeview/apps/lib/claude"
)

const epsilon = 1e-9

func almostEqual(a, b float64) bool {
	return math.Abs(a-b) < epsilon
}

func TestCostUSD(t *testing.T) {
	// A normal assistant usage: a little uncached input, some output, and both
	// kinds of cache tokens, so every rate contributes to the total.
	usage := claude.Usage{
		InputTokens:              1_000,
		OutputTokens:             2_000,
		CacheCreationInputTokens: 500,
		CacheReadInputTokens:     10_000,
	}

	tests := []struct {
		name  string
		model string
		usage claude.Usage
		// inRate/outRate are the expected per-million input/output list prices
		// used to compute the reference cost; cache rates are derived the same
		// way the package does.
		inRate  float64
		outRate float64
	}{
		{
			name:    "known sonnet snapshot",
			model:   "claude-3-5-sonnet-20241022",
			usage:   usage,
			inRate:  3.00,
			outRate: 15.00,
		},
		{
			name:    "known opus snapshot",
			model:   "claude-opus-4-1-20250805",
			usage:   usage,
			inRate:  15.00,
			outRate: 75.00,
		},
		{
			name:    "known haiku snapshot",
			model:   "claude-haiku-4-5-20251001",
			usage:   usage,
			inRate:  1.00,
			outRate: 5.00,
		},
		{
			name:    "family fallback opus (unknown snapshot)",
			model:   "claude-opus-9-99-20990101",
			usage:   usage,
			inRate:  15.00,
			outRate: 75.00,
		},
		{
			name:    "family fallback sonnet (unknown snapshot)",
			model:   "claude-sonnet-9-99-20990101",
			usage:   usage,
			inRate:  3.00,
			outRate: 15.00,
		},
		{
			name:    "family fallback haiku (unknown snapshot)",
			model:   "claude-haiku-9-99-20990101",
			usage:   usage,
			inRate:  1.00,
			outRate: 5.00,
		},
		{
			name:    "unknown model falls back to sonnet default",
			model:   "gpt-imaginary",
			usage:   usage,
			inRate:  3.00,
			outRate: 15.00,
		},
		{
			name:    "blank model falls back to sonnet default",
			model:   "",
			usage:   usage,
			inRate:  3.00,
			outRate: 15.00,
		},
		{
			name:    "case-insensitive known model",
			model:   "Claude-3-5-Sonnet-20241022",
			usage:   usage,
			inRate:  3.00,
			outRate: 15.00,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			want := referenceCost(tt.inRate, tt.outRate, tt.usage)
			got := CostUSD(tt.model, tt.usage)
			if !almostEqual(got, want) {
				t.Errorf("CostUSD(%q) = %v, want %v", tt.model, got, want)
			}
			if got <= 0 {
				t.Errorf("CostUSD(%q) = %v, want a positive cost for non-zero usage", tt.model, got)
			}
		})
	}
}

func TestCostUSDZeroUsage(t *testing.T) {
	for _, model := range []string{"claude-3-5-sonnet-20241022", "unknown", ""} {
		if got := CostUSD(model, claude.Usage{}); got != 0 {
			t.Errorf("CostUSD(%q, zero usage) = %v, want 0", model, got)
		}
	}
}

func TestCostUSDDoesNotPanicOnUnknown(t *testing.T) {
	// Blank and arbitrary model ids must resolve to rates, not panic.
	_ = CostUSD("", claude.Usage{InputTokens: 1})
	_ = CostUSD("something-unrecognized", claude.Usage{OutputTokens: 1})
}

// referenceCost recomputes the expected cost independently of ratesFor, using
// the same cache multipliers the package applies to the input rate.
func referenceCost(inPerM, outPerM float64, u claude.Usage) float64 {
	in := inPerM / 1e6
	out := outPerM / 1e6
	cacheWrite := inPerM * cacheWriteMultiplier / 1e6
	cacheRead := inPerM * cacheReadMultiplier / 1e6
	return in*float64(u.InputTokens) +
		out*float64(u.OutputTokens) +
		cacheWrite*float64(u.CacheCreationInputTokens) +
		cacheRead*float64(u.CacheReadInputTokens)
}
