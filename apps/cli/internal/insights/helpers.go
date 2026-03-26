package insights

import (
	"github.com/driangle/vibeview/internal/claude"
	"github.com/driangle/vibeview/internal/redact"
)

// GetContentBlocks safely extracts content blocks from a message.
func GetContentBlocks(msg claude.Message) []claude.ContentBlock {
	if msg.Message == nil {
		return nil
	}
	return msg.Message.Content
}

// BuildToolResultMap builds a map from tool_use_id to tool_result content block.
func BuildToolResultMap(messages []claude.Message) map[string]claude.ContentBlock {
	m := make(map[string]claude.ContentBlock)
	for _, msg := range messages {
		if msg.Type != claude.MessageTypeUser || msg.Message == nil {
			continue
		}
		for _, block := range msg.Message.Content {
			if block.Type == "tool_result" && block.ToolUseID != "" {
				m[block.ToolUseID] = block
			}
		}
	}
	return m
}

// ResolveResultText extracts text from a tool_result content block.
// Handles content being a string or an array of {type, text} objects.
func ResolveResultText(block claude.ContentBlock) string {
	if block.Content == nil {
		return ""
	}
	if s, ok := block.Content.(string); ok {
		return redact.RedactSecrets(s)
	}
	if arr, ok := block.Content.([]any); ok {
		for _, item := range arr {
			m, ok := item.(map[string]any)
			if !ok {
				continue
			}
			if m["type"] == "text" {
				if text, ok := m["text"].(string); ok && text != "" {
					return redact.RedactSecrets(text)
				}
			}
		}
	}
	return ""
}
