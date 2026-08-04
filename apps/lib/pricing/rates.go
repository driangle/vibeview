package pricing

import "strings"

// Rates holds per-token USD prices for a model. Prompt-cache tokens are billed
// at a multiple of the base input rate (a write costs more, a read far less).
type Rates struct {
	Input         float64 // per input token
	Output        float64 // per output token
	CacheCreation float64 // per cache_creation_input_token (cache write)
	CacheRead     float64 // per cache_read_input_token (cache read)
}

// Prompt-caching multipliers applied to the base input rate. Anthropic bills a
// 5-minute cache write at 1.25x the input rate and a cache read at 0.1x.
const (
	cacheWriteMultiplier = 1.25
	cacheReadMultiplier  = 0.10
)

// perMillion builds Rates from published per-million-token list prices, deriving
// the cache rates from the input rate via the multipliers above.
func perMillion(input, output float64) Rates {
	return Rates{
		Input:         input / 1e6,
		Output:        output / 1e6,
		CacheCreation: input * cacheWriteMultiplier / 1e6,
		CacheRead:     input * cacheReadMultiplier / 1e6,
	}
}

// modelRates maps a lowercase model id to its rates.
//
// Rates are Anthropic's published list prices in USD per million tokens
// (input / output). Source: https://www.anthropic.com/pricing and
// https://docs.claude.com/en/docs/about-claude/pricing. Update the two numbers
// in each perMillion(...) call when prices change — this table and the family
// fallbacks below are the single place rates live.
var modelRates = map[string]Rates{
	// Claude 4 family
	"claude-opus-4-20250514":     perMillion(15.00, 75.00),
	"claude-opus-4-1-20250805":   perMillion(15.00, 75.00),
	"claude-sonnet-4-20250514":   perMillion(3.00, 15.00),
	"claude-sonnet-4-5-20250929": perMillion(3.00, 15.00),
	"claude-haiku-4-5-20251001":  perMillion(1.00, 5.00),

	// Claude 3.x family
	"claude-3-opus-20240229":     perMillion(15.00, 75.00),
	"claude-3-5-sonnet-20240620": perMillion(3.00, 15.00),
	"claude-3-5-sonnet-20241022": perMillion(3.00, 15.00),
	"claude-3-7-sonnet-20250219": perMillion(3.00, 15.00),
	"claude-3-haiku-20240307":    perMillion(0.25, 1.25),
	"claude-3-5-haiku-20241022":  perMillion(0.80, 4.00),
}

// Family fallbacks by model-id substring, for ids not in modelRates (e.g. a
// newer dated snapshot). These use representative per-family list prices.
var (
	familyOpus   = perMillion(15.00, 75.00)
	familySonnet = perMillion(3.00, 15.00)
	familyHaiku  = perMillion(1.00, 5.00)
)

// ratesFor resolves the rates for a model id. It tries an exact match, then a
// family-prefix match (opus / sonnet / haiku), and finally falls back to the
// Sonnet family — a sensible mid-tier default — for blank or unrecognized ids.
func ratesFor(model string) Rates {
	id := strings.ToLower(strings.TrimSpace(model))
	if r, ok := modelRates[id]; ok {
		return r
	}
	switch {
	case strings.Contains(id, "opus"):
		return familyOpus
	case strings.Contains(id, "sonnet"):
		return familySonnet
	case strings.Contains(id, "haiku"):
		return familyHaiku
	default:
		return familySonnet
	}
}
