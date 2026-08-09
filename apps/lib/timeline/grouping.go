package timeline

import "github.com/driangle/vibeview/apps/lib/claude"

// rawExchange holds the messages grouped into a single exchange before metrics
// are computed. Messages are also kept in encounter (chronological) order so the
// exchange's UUID list and timing reflect the original sequence.
type rawExchange struct {
	userMessage       *claude.Message
	assistantMessages []claude.Message
	auxiliaryMessages []claude.Message
	ordered           []claude.Message
}

// isUserPrompt reports whether a message is a genuine user prompt rather than a
// forwarded tool result. It mirrors the client rule: a user message counts as a
// prompt unless its content is present and consists purely of tool_result blocks.
func isUserPrompt(msg claude.Message) bool {
	if msg.Type != claude.MessageTypeUser {
		return false
	}
	if msg.Message == nil || len(msg.Message.Content) == 0 {
		return true
	}
	for _, block := range msg.Message.Content {
		if block.Type != "tool_result" {
			return true
		}
	}
	return false
}

// isTimelineNoise reports whether a message should be excluded from the timeline
// entirely. Meta messages (slash-command markers like /clear, caveats, local
// command stdout) and subagent sidechain turns are not part of the human
// conversation: keeping them would let a meta message spuriously start a new
// exchange and let sidechain prompts interleave subagent turns into the main
// track. Mirrors the CLI show renderer's skip rule.
func isTimelineNoise(msg claude.Message) bool {
	return msg.IsMeta || msg.IsSidechain
}

// groupIntoExchanges splits messages into raw exchanges. Meta and sidechain
// messages are dropped first (see isTimelineNoise). A genuine user prompt starts
// a new exchange; assistant messages accumulate into the current one; everything
// else (tool-result-only user messages, progress, system, snapshots) is
// auxiliary. Leading assistant/auxiliary messages with no prior prompt form an
// exchange with a nil user message.
func groupIntoExchanges(messages []claude.Message) []rawExchange {
	var exchanges []rawExchange
	var current *rawExchange

	flush := func() {
		if current != nil {
			exchanges = append(exchanges, *current)
			current = nil
		}
	}

	for _, msg := range messages {
		if isTimelineNoise(msg) {
			continue
		}
		switch {
		case isUserPrompt(msg):
			flush()
			m := msg
			current = &rawExchange{userMessage: &m}
		case msg.Type == claude.MessageTypeAssistant:
			if current == nil {
				current = &rawExchange{}
			}
			current.assistantMessages = append(current.assistantMessages, msg)
		default:
			if current == nil {
				current = &rawExchange{}
			}
			current.auxiliaryMessages = append(current.auxiliaryMessages, msg)
		}
		current.ordered = append(current.ordered, msg)
	}
	flush()

	return exchanges
}
