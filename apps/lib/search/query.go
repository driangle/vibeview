package search

import (
	"strings"
	"unicode"
)

// parseQuery splits a raw query into lowercased search terms.
//
// Whitespace separates terms, so `refactor review cli` becomes three
// independent terms that a session can match in any position or order. A
// double-quoted span becomes a single phrase term, so `"exact phrase"` keeps
// the words adjacent — reserving phrase/proximity matching for explicit intent
// while a bare multi-word query behaves as topical keyword search.
func parseQuery(raw string) []string {
	var terms []string
	var buf strings.Builder
	inQuote := false

	flush := func() {
		if buf.Len() > 0 {
			terms = append(terms, buf.String())
			buf.Reset()
		}
	}

	for _, r := range strings.ToLower(raw) {
		switch {
		case r == '"':
			// A quote boundary ends the current term either way.
			flush()
			inQuote = !inQuote
		case !inQuote && unicode.IsSpace(r):
			flush()
		default:
			buf.WriteRune(r)
		}
	}
	flush()
	return terms
}
