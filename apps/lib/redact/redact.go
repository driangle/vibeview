// Package redact provides pattern-based redaction of sensitive data
// (secrets, tokens, credentials) and home directory masking.
package redact

import (
	"math"
	"os"
	"regexp"
	"strings"
)

const placeholder = "[REDACTED]"

type pattern struct {
	re          *regexp.Regexp
	replacement string
}

// sensitivePatterns matches known secret-bearing patterns and captures
// the prefix (key/flag) so only the value is replaced.
var sensitivePatterns = []pattern{
	// CLI flags: --password=..., --secret=..., --token=...
	{regexp.MustCompile(`(--(?:password|secret|token|api[_-]?key|db[_-]?password)[ =])(\S+)`), "${1}" + placeholder},

	// HTTP headers: -H "Authorization: Bearer ..." or -H "Authorization: ..."
	{regexp.MustCompile(`(-H\s+["']?Authorization:\s*(?:Bearer\s+)?)([^\s"']+)`), "${1}" + placeholder},

	// Environment-style variables: API_KEY=..., DATABASE_URL=..., etc.
	{regexp.MustCompile(`((?:API_KEY|SECRET_KEY|AUTH_TOKEN|ACCESS_TOKEN|DATABASE_URL|ANTHROPIC_API_KEY|OPENAI_API_KEY|AWS_SECRET_ACCESS_KEY|GITHUB_TOKEN|NPM_TOKEN|PRIVATE_KEY)=)(\S+)`), "${1}" + placeholder},

	// Bearer tokens in text: "Bearer eyJ..."
	{regexp.MustCompile(`(Bearer\s+)([A-Za-z0-9._~+/=-]{20,})`), "${1}" + placeholder},

	// Connection strings: postgres://user:pass@host, mysql://user:pass@host, mongodb+srv://...
	{regexp.MustCompile(`((?:postgres|mysql|mongodb(?:\+srv)?|redis|amqp)://[^:]+:)([^@]+)(@)`), "${1}" + placeholder + "${3}"},

	// Standalone provider credentials and access tokens commonly printed by tools.
	{regexp.MustCompile(`\b(?:AKIA|ASIA)[A-Z0-9]{16}\b`), placeholder},
	{regexp.MustCompile(`\bsk-ant-[A-Za-z0-9_-]{20,}\b`), placeholder},
	{regexp.MustCompile(`\bsk-[A-Za-z0-9_-]{20,}\b`), placeholder},
	{regexp.MustCompile(`\bgh[po]_[A-Za-z0-9]{20,}\b`), placeholder},

	// JWTs, including bare tokens without an Authorization/Bearer prefix.
	{regexp.MustCompile(`\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b`), placeholder},
}

// sshKeyBlock matches SSH private key blocks.
var sshKeyBlock = regexp.MustCompile(`(?s)(-----BEGIN [A-Z ]*PRIVATE KEY-----).+?(-----END [A-Z ]*PRIVATE KEY-----)`)

var (
	hexBlob    = regexp.MustCompile(`\b[[:xdigit:]]{32,}\b`)
	base64Blob = regexp.MustCompile(`\b[A-Za-z0-9_+/=-]{40,}\b`)
)

// RedactSecrets replaces values of known sensitive patterns with [REDACTED].
func RedactSecrets(text string) string {
	for _, p := range sensitivePatterns {
		text = p.re.ReplaceAllString(text, p.replacement)
	}
	text = sshKeyBlock.ReplaceAllString(text, "${1}\n"+placeholder+"\n${2}")
	text = redactHighEntropy(text, hexBlob, 3.5)
	text = redactHighEntropy(text, base64Blob, 4.3)
	return text
}

// redactHighEntropy catches unlabelled credential material while leaving long,
// repetitive identifiers alone. Entropy is measured in bits per byte.
func redactHighEntropy(text string, candidates *regexp.Regexp, minEntropy float64) string {
	return candidates.ReplaceAllStringFunc(text, func(candidate string) string {
		counts := make(map[byte]int)
		for i := 0; i < len(candidate); i++ {
			counts[candidate[i]]++
		}

		var entropy float64
		for _, count := range counts {
			p := float64(count) / float64(len(candidate))
			entropy -= p * math.Log2(p)
		}
		if entropy >= minEntropy {
			return placeholder
		}
		return candidate
	})
}

var homeDir string

func init() {
	homeDir, _ = os.UserHomeDir()
}

// MaskHomePath replaces the user's home directory prefix with ~.
func MaskHomePath(path string) string {
	if homeDir == "" || !strings.HasPrefix(path, homeDir) {
		return path
	}
	rest := path[len(homeDir):]
	// Only match if the home dir is the full path or followed by a separator.
	if rest != "" && rest[0] != '/' {
		return path
	}
	return "~" + rest
}
