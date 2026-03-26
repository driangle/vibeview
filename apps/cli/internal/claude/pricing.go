package claude

import (
	_ "embed"
	"encoding/json"
	"strings"
	"sync"
)

// ModelPricing holds per-million-token prices in USD.
type ModelPricing struct {
	InputPerM      float64 `json:"inputPerM"`
	OutputPerM     float64 `json:"outputPerM"`
	CacheReadPerM  float64 `json:"cacheReadPerM"`
	CacheWritePerM float64 `json:"cacheWritePerM"`
}

//go:embed pricing.json
var defaultPricingData []byte

var (
	pricingOnce  sync.Once
	modelPricing map[string]ModelPricing
)

func ensurePricingLoaded() {
	pricingOnce.Do(func() {
		LoadPricing(defaultPricingData)
	})
}

// LoadPricing parses a JSON pricing table (model name -> ModelPricing).
// This overrides the embedded default pricing, useful for tests.
func LoadPricing(data []byte) error {
	var m map[string]ModelPricing
	if err := json.Unmarshal(data, &m); err != nil {
		return err
	}
	modelPricing = m
	return nil
}

// GetPricingJSON returns the raw embedded pricing data for serving via API.
func GetPricingJSON() []byte {
	return defaultPricingData
}

// lookupPricing returns pricing for a model, matching by prefix.
func lookupPricing(model string) (ModelPricing, bool) {
	ensurePricingLoaded()
	if p, ok := modelPricing[model]; ok {
		return p, true
	}
	for base, p := range modelPricing {
		if strings.HasPrefix(model, base) {
			return p, true
		}
	}
	return ModelPricing{}, false
}

// CalculateCost returns the estimated cost in USD for a single API response.
// The second return value is false when the model has no pricing data, in which
// case cost is 0 and the caller should track/warn about the unknown model.
func CalculateCost(model string, u Usage) (float64, bool) {
	p, ok := lookupPricing(model)
	if !ok {
		return 0, false
	}
	cost := (float64(u.InputTokens)*p.InputPerM +
		float64(u.OutputTokens)*p.OutputPerM +
		float64(u.CacheReadInputTokens)*p.CacheReadPerM +
		float64(u.CacheCreationInputTokens)*p.CacheWritePerM) / 1_000_000
	return cost, true
}
