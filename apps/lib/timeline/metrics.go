package timeline

import (
	"sort"

	"github.com/driangle/vibeview/apps/lib/claude"
	"github.com/driangle/vibeview/apps/lib/insights"
	"github.com/driangle/vibeview/apps/lib/pricing"
	"github.com/driangle/vibeview/apps/lib/redact"
)

// promptPreviewLen bounds the prompt preview to a single row's worth of text.
const promptPreviewLen = 100

// deepThinkingThreshold is the total thinking-block character count above which
// an exchange is flagged as deep thinking, matching the client badge rule.
const deepThinkingThreshold = 500

// promptPreview returns a redacted, truncated preview of the prompt's first text
// block. Redaction runs before truncation so a secret is never partially exposed.
func promptPreview(userMsg *claude.Message) string {
	if userMsg == nil || userMsg.Message == nil {
		return ""
	}
	for _, block := range userMsg.Message.Content {
		if block.Type == "text" && block.Text != "" {
			return truncateRunes(redact.RedactSecrets(block.Text), promptPreviewLen)
		}
	}
	return ""
}

// truncateRunes returns at most n runes of s, avoiding cutting a multibyte
// character in half.
func truncateRunes(s string, n int) string {
	runes := []rune(s)
	if len(runes) <= n {
		return s
	}
	return string(runes[:n])
}

// firstModel returns the model id of the first assistant message that declares
// one, or "" if none do.
func firstModel(assistantMsgs []claude.Message) string {
	for _, msg := range assistantMsgs {
		if msg.Message != nil && msg.Message.Model != "" {
			return msg.Message.Model
		}
	}
	return ""
}

// sumTokens totals input+output tokens across assistant usage, matching the
// client computeTotalTokens.
func sumTokens(assistantMsgs []claude.Message) int {
	total := 0
	for _, msg := range assistantMsgs {
		if msg.Message != nil && msg.Message.Usage != nil {
			total += msg.Message.Usage.InputTokens + msg.Message.Usage.OutputTokens
		}
	}
	return total
}

// sumCost totals the USD cost of each assistant message's usage via the pricing
// helper, billing each message at its own model's rates.
func sumCost(assistantMsgs []claude.Message) float64 {
	var cost float64
	for _, msg := range assistantMsgs {
		if msg.Message != nil && msg.Message.Usage != nil {
			cost += pricing.CostUSD(msg.Message.Model, *msg.Message.Usage)
		}
	}
	return cost
}

// distinctTools returns the sorted set of tool names used across the messages.
func distinctTools(assistantMsgs []claude.Message) []string {
	set := make(map[string]bool)
	for _, msg := range assistantMsgs {
		for _, block := range insights.GetContentBlocks(msg) {
			if block.Type == "tool_use" && block.Name != "" {
				set[block.Name] = true
			}
		}
	}
	return sortedSet(set)
}

// distinctFiles returns the sorted set of masked file paths touched by any
// tool_use block carrying a file_path.
func distinctFiles(assistantMsgs []claude.Message) []string {
	set := make(map[string]bool)
	for _, msg := range assistantMsgs {
		for _, block := range insights.GetContentBlocks(msg) {
			if block.Type != "tool_use" || block.Input == nil {
				continue
			}
			if fp, ok := block.Input["file_path"].(string); ok && fp != "" {
				set[redact.MaskHomePath(fp)] = true
			}
		}
	}
	return sortedSet(set)
}

// commandList returns the bash commands run in the exchange, in order and
// redacted, via the shared extractor.
func commandList(assistantMsgs []claude.Message) []string {
	entries := insights.ExtractBashCommands(assistantMsgs)
	commands := make([]string, 0, len(entries))
	for _, e := range entries {
		commands = append(commands, e.Command)
	}
	return commands
}

// skillList returns the distinct skill names invoked in the exchange, via the
// shared extractor (ordered by invocation count).
func skillList(msgs []claude.Message) []string {
	entries := insights.ExtractSkills(msgs)
	skills := make([]string, 0, len(entries))
	for _, e := range entries {
		skills = append(skills, e.Name)
	}
	return skills
}

// computeFlags derives the exchange badges from its messages.
func computeFlags(raw rawExchange) ExchangeFlags {
	return ExchangeFlags{
		HasErrors:    hasErrorResults(raw.ordered),
		DeepThinking: thinkingChars(raw.assistantMessages) > deepThinkingThreshold,
		HasSubagents: hasSubagents(raw.ordered),
		ApprovalGate: endsOnToolUse(raw.assistantMessages),
	}
}

// hasErrorResults reports whether any user tool_result block in the messages is
// flagged as an error, mirroring the client lightweight check.
func hasErrorResults(msgs []claude.Message) bool {
	for _, msg := range msgs {
		if msg.Type != claude.MessageTypeUser {
			continue
		}
		for _, block := range insights.GetContentBlocks(msg) {
			if block.Type == "tool_result" && block.IsError {
				return true
			}
		}
	}
	return false
}

// thinkingChars sums the character length of thinking blocks across the messages.
func thinkingChars(assistantMsgs []claude.Message) int {
	total := 0
	for _, msg := range assistantMsgs {
		for _, block := range insights.GetContentBlocks(msg) {
			if block.Type == "thinking" {
				total += len(block.Thinking)
			}
		}
	}
	return total
}

// hasSubagents reports whether the messages contain any subagent activity — an
// agent_progress message or an Agent tool_use — mirroring the client check.
func hasSubagents(msgs []claude.Message) bool {
	for _, msg := range msgs {
		if msg.Type == claude.MessageTypeProgress {
			if t, _ := msg.Data["type"].(string); t == "agent_progress" {
				if id := msg.Data["agentId"]; id != nil && id != "" {
					return true
				}
			}
		}
		for _, block := range insights.GetContentBlocks(msg) {
			if block.Type == "tool_use" && block.Name == "Agent" {
				return true
			}
		}
	}
	return false
}

// endsOnToolUse reports whether the last content block of the last assistant
// message is a tool_use — the exchange is waiting on an approval/result.
func endsOnToolUse(assistantMsgs []claude.Message) bool {
	if len(assistantMsgs) == 0 {
		return false
	}
	blocks := insights.GetContentBlocks(assistantMsgs[len(assistantMsgs)-1])
	if len(blocks) == 0 {
		return false
	}
	return blocks[len(blocks)-1].Type == "tool_use"
}

// sortedSet returns the keys of a set as a sorted slice (never nil).
func sortedSet(set map[string]bool) []string {
	keys := make([]string, 0, len(set))
	for k := range set {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	return keys
}
