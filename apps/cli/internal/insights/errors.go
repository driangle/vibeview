package insights

import (
	"github.com/driangle/vibeview/internal/claude"
)

// ExtractErrors finds tool_use blocks whose results have is_error set.
func ExtractErrors(messages []claude.Message, toolResults map[string]claude.ContentBlock) []ErrorEntry {
	var errors []ErrorEntry

	for _, msg := range messages {
		for _, block := range GetContentBlocks(msg) {
			if block.Type != "tool_use" || block.ID == "" || block.Name == "" {
				continue
			}
			result, ok := toolResults[block.ID]
			if !ok || !result.IsError {
				continue
			}
			text := ResolveResultText(result)
			snippet := text
			if len(snippet) > 200 {
				snippet = snippet[:200]
			}
			errors = append(errors, ErrorEntry{
				ToolName:    block.Name,
				Snippet:     snippet,
				MessageUUID: msg.UUID,
			})
		}
	}

	return errors
}
