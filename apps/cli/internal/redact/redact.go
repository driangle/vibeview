// Package redact provides pattern-based redaction of sensitive data
// (secrets, tokens, credentials) and home directory masking.
package redact

import (
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
}

// sshKeyBlock matches SSH private key blocks.
var sshKeyBlock = regexp.MustCompile(`(?s)(-----BEGIN [A-Z ]*PRIVATE KEY-----).+?(-----END [A-Z ]*PRIVATE KEY-----)`)

// RedactSecrets replaces values of known sensitive patterns with [REDACTED].
func RedactSecrets(text string) string {
	for _, p := range sensitivePatterns {
		text = p.re.ReplaceAllString(text, p.replacement)
	}
	text = sshKeyBlock.ReplaceAllString(text, "${1}\n"+placeholder+"\n${2}")
	return text
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
