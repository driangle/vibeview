package search

import (
	"strings"

	"github.com/driangle/vibeview/apps/lib/claude"
	"github.com/driangle/vibeview/apps/lib/redact"
)

type MessageResult struct {
	MessageUUID  string `json:"messageUuid"`
	MessageIndex int    `json:"messageIndex"`
	Role         string `json:"role"`
	Snippet      string `json:"snippet"`
	MatchStart   int    `json:"matchStart"`
}

// SearchMessages searches displayable message text for a single conversation.
func SearchMessages(messages []claude.Message, query string, limit int) []MessageResult {
	query = strings.TrimSpace(query)
	if query == "" || limit <= 0 {
		return []MessageResult{}
	}
	lowerQuery := strings.ToLower(query)
	results := make([]MessageResult, 0)
	for index, message := range messages {
		text := messageText(message)
		lowerText := strings.ToLower(text)
		for offset := 0; offset < len(lowerText); {
			relative := strings.Index(lowerText[offset:], lowerQuery)
			if relative < 0 {
				break
			}
			match := offset + relative
			start := match - 40
			if start < 0 {
				start = 0
			}
			end := match + len(query) + 40
			if end > len(text) {
				end = len(text)
			}
			snippet := text[start:end]
			if start > 0 {
				snippet = "..." + snippet
			}
			if end < len(text) {
				snippet += "..."
			}
			results = append(results, MessageResult{MessageUUID: message.UUID, MessageIndex: index, Role: string(message.Type), Snippet: redact.RedactSecrets(snippet), MatchStart: match})
			if len(results) >= limit {
				return results
			}
			offset = match + 1
		}
	}
	return results
}

func messageText(message claude.Message) string {
	if message.Message == nil {
		return ""
	}
	parts := make([]string, 0, len(message.Message.Content))
	for _, block := range message.Message.Content {
		if block.Type == "text" && block.Text != "" {
			parts = append(parts, block.Text)
		}
	}
	return strings.Join(parts, "\n")
}
