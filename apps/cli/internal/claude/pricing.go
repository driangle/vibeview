package claude

import "strings"

// ModelPricing holds per-million-token prices in USD.
type ModelPricing struct {
	InputPerM       float64
	OutputPerM      float64
	CacheReadPerM   float64
	CacheWritePerM  float64
}

var modelPricing = map[string]ModelPricing{
	"claude-opus-4": {
		InputPerM: 15, OutputPerM: 75, CacheReadPerM: 1.5, CacheWritePerM: 18.75,
	},
	"claude-sonnet-4": {
		InputPerM: 3, OutputPerM: 15, CacheReadPerM: 0.30, CacheWritePerM: 3.75,
	},
	"claude-haiku-4": {
		InputPerM: 0.80, OutputPerM: 4, CacheReadPerM: 0.08, CacheWritePerM: 1,
	},
}

// lookupPricing returns pricing for a model, matching by prefix.
func lookupPricing(model string) (ModelPricing, bool) {
	// Try exact match first.
	if p, ok := modelPricing[model]; ok {
		return p, true
	}
	// Match by base model name (e.g. "claude-sonnet-4-20250514" -> "claude-sonnet-4").
	for base, p := range modelPricing {
		if strings.HasPrefix(model, base) {
			return p, true
		}
	}
	return ModelPricing{}, false
}

// CalculateCost returns the estimated cost in USD for a single API response.
func CalculateCost(model string, u Usage) float64 {
	p, ok := lookupPricing(model)
	if !ok {
		return 0
	}
	return (float64(u.InputTokens)*p.InputPerM +
		float64(u.OutputTokens)*p.OutputPerM +
		float64(u.CacheReadInputTokens)*p.CacheReadPerM +
		float64(u.CacheCreationInputTokens)*p.CacheWritePerM) / 1_000_000
}
