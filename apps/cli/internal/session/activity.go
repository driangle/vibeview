package session

import (
	"time"

	"github.com/driangle/vibeview/internal/claude"
)

// Activity state constants.
const (
	ActivityWorking            = "working"
	ActivityWaitingForApproval = "waiting_for_approval"
	ActivityWaitingForInput    = "waiting_for_input"
	ActivityIdle               = "idle"
)

const idleThresholdMs = 5 * 60 * 1000 // 5 minutes

// DeriveActivityState examines the last few messages to determine what the session is doing.
func DeriveActivityState(messages []claude.Message) string {
	if len(messages) == 0 {
		return ActivityIdle
	}

	// Check if the last meaningful message is older than 5 minutes.
	// Clamp future timestamps (clock skew) to now so the idle check still works.
	lastTimestamp := lastMessageTimestamp(messages)
	nowMs := time.Now().UnixMilli()
	const maxFutureMs = 60 * 60 * 1000 // 1 hour
	if lastTimestamp > 0 && lastTimestamp > nowMs+maxFutureMs {
		lastTimestamp = nowMs
	}
	if lastTimestamp > 0 && nowMs-lastTimestamp > int64(idleThresholdMs) {
		return ActivityIdle
	}

	// Walk backwards to find the last semantically meaningful message.
	// Skip sidechain (subagent) and meta messages — they don't reflect the
	// main conversation's state.
	for i := len(messages) - 1; i >= 0; i-- {
		msg := messages[i]

		if msg.IsSidechain || msg.IsMeta {
			continue
		}

		switch msg.Type {
		case claude.MessageTypeAssistant:
			if msg.Message == nil {
				continue
			}
			if hasToolUse(msg.Message.Content) {
				// Check if there's a subsequent user tool_result for this assistant's tool_use.
				if !hasMatchingToolResult(messages, i) {
					return ActivityWaitingForApproval
				}
				return ActivityWorking
			}
			// Assistant message with text only (no tool_use) → waiting for user input.
			return ActivityWaitingForInput

		case claude.MessageTypeUser:
			if msg.Message != nil && hasToolResult(msg.Message.Content) {
				return ActivityWorking
			}
			// Regular user message → assistant should be working on it.
			return ActivityWorking

		case claude.MessageTypeProgress:
			return ActivityWorking

		case claude.MessageTypeResult:
			return ActivityIdle

		// Skip non-semantic message types.
		case claude.MessageTypeSystem, claude.MessageTypeFileHistorySnapshot, claude.MessageTypeCustomTitle, claude.MessageTypeQueueOperation, claude.MessageTypeLastPrompt:
			continue
		}
	}

	return ActivityIdle
}

// DeriveActivityStateFromMessage derives activity state from a single message.
// This is a lightweight version for streaming updates where we don't have full history.
// Sidechain (subagent) and meta messages are ignored — they don't reflect main conversation state.
func DeriveActivityStateFromMessage(msg claude.Message) string {
	if msg.IsSidechain || msg.IsMeta {
		return ""
	}

	switch msg.Type {
	case claude.MessageTypeAssistant:
		if msg.Message != nil && hasToolUse(msg.Message.Content) {
			return ActivityWaitingForApproval
		}
		return ActivityWaitingForInput

	case claude.MessageTypeUser:
		if msg.Message != nil && hasToolResult(msg.Message.Content) {
			return ActivityWorking
		}
		return ActivityWorking

	case claude.MessageTypeProgress:
		return ActivityWorking

	case claude.MessageTypeResult:
		return ActivityIdle

	default:
		return ""
	}
}

func lastMessageTimestamp(messages []claude.Message) int64 {
	for i := len(messages) - 1; i >= 0; i-- {
		if ts := messages[i].Timestamp.Int64(); ts > 0 {
			return ts
		}
	}
	return 0
}

func hasToolUse(blocks []claude.ContentBlock) bool {
	for _, b := range blocks {
		if b.Type == "tool_use" {
			return true
		}
	}
	return false
}

func hasToolResult(blocks []claude.ContentBlock) bool {
	for _, b := range blocks {
		if b.Type == "tool_result" {
			return true
		}
	}
	return false
}

// hasMatchingToolResult checks if any user message after index i contains a tool_result.
func hasMatchingToolResult(messages []claude.Message, assistantIdx int) bool {
	for j := assistantIdx + 1; j < len(messages); j++ {
		msg := messages[j]
		if msg.Type == claude.MessageTypeUser && msg.Message != nil && hasToolResult(msg.Message.Content) {
			return true
		}
	}
	return false
}
