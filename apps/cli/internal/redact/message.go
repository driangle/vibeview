package redact

import "github.com/driangle/vibeview/internal/claude"

// RedactAPIMessage returns a copy of the APIMessage with sensitive data redacted
// in all content blocks. Returns nil if msg is nil.
func RedactAPIMessage(msg *claude.APIMessage) *claude.APIMessage {
	if msg == nil {
		return nil
	}
	redacted := *msg
	if len(msg.Content) > 0 {
		redacted.Content = make([]claude.ContentBlock, len(msg.Content))
		for i, block := range msg.Content {
			redacted.Content[i] = redactContentBlock(block)
		}
	}
	return &redacted
}

func redactContentBlock(block claude.ContentBlock) claude.ContentBlock {
	if block.Text != "" {
		block.Text = RedactSecrets(block.Text)
	}
	if block.Thinking != "" {
		block.Thinking = RedactSecrets(block.Thinking)
	}
	if block.Input != nil {
		block.Input = RedactMapValues(block.Input)
	}
	if block.Content != nil {
		block.Content = redactAny(block.Content)
	}
	return block
}

// RedactMapValues returns a copy of the map with all string values redacted.
// Nested maps and slices are handled recursively. Returns nil if m is nil.
func RedactMapValues(m map[string]any) map[string]any {
	if m == nil {
		return nil
	}
	result := make(map[string]any, len(m))
	for k, v := range m {
		result[k] = redactAny(v)
	}
	return result
}

func redactAny(v any) any {
	switch val := v.(type) {
	case string:
		return RedactSecrets(val)
	case map[string]any:
		return RedactMapValues(val)
	case []any:
		result := make([]any, len(val))
		for i, item := range val {
			result[i] = redactAny(item)
		}
		return result
	default:
		return v
	}
}
