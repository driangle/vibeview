package insights

import (
	"regexp"

	"github.com/driangle/vibeview/internal/claude"
)

var skillExpansionRe = regexp.MustCompile(`^Base directory for this skill:.*\/skills\/([^\s/]+)`)

// ClassifyMessageKind determines a special messageKind for isMeta user messages.
// Returns "skill-expansion" for skill expansion messages, empty string otherwise.
func ClassifyMessageKind(msg claude.Message) string {
	if !msg.IsMeta || msg.Type != claude.MessageTypeUser {
		return ""
	}
	text := messageText(msg)
	if skillExpansionRe.MatchString(text) {
		return "skill-expansion"
	}
	return ""
}

// ExtractSkillExpansionName extracts the skill name from a skill expansion message.
// Returns empty string if the message is not a skill expansion.
func ExtractSkillExpansionName(msg claude.Message) string {
	text := messageText(msg)
	m := skillExpansionRe.FindStringSubmatch(text)
	if m != nil {
		return m[1]
	}
	return ""
}
