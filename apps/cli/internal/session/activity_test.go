package session

import (
	"testing"
	"time"

	"github.com/driangle/vibeview/internal/claude"
)

// mockProcessChecker implements ProcessChecker for testing.
type mockProcessChecker struct {
	alive map[string]bool
}

func (m *mockProcessChecker) IsProcessAlive(sessionID string) bool {
	if alive, ok := m.alive[sessionID]; ok {
		return alive
	}
	return true // fail-open by default
}

func TestEnrichWithDeadProcess(t *testing.T) {
	dir := setupTestDir(t)

	idx, err := Discover(dir, nil)
	if err != nil {
		t.Fatal(err)
	}

	checker := &mockProcessChecker{
		alive: map[string]bool{
			"sess-1": false,
			"sess-2": false,
		},
	}
	idx.SetProcessChecker(checker)

	// Enrich all sessions — the checker should force dead ones to idle.
	idx.Enrich(dir)

	for _, s := range idx.GetSessions() {
		if s.ActivityState != ActivityIdle {
			t.Errorf("session %s: expected %q with dead process, got %q", s.SessionID, ActivityIdle, s.ActivityState)
		}
	}
}

func TestEnrichWithNilChecker(t *testing.T) {
	dir := setupTestDir(t)

	idx, err := Discover(dir, nil)
	if err != nil {
		t.Fatal(err)
	}

	// Don't set a process checker — existing behavior should be preserved.
	idx.Enrich(dir)

	sessions := idx.GetSessions()
	if len(sessions) == 0 {
		t.Fatal("expected sessions after enrichment")
	}

	// With nil checker, activity state should be derived from messages only.
	// Both test sessions have old timestamps so they should be idle.
	for _, s := range sessions {
		if s.ActivityState != ActivityIdle {
			t.Errorf("session %s: expected %q with nil checker and old timestamps, got %q",
				s.SessionID, ActivityIdle, s.ActivityState)
		}
	}
}

// --- DeriveActivityState tests ---

func recentTimestamp() claude.Timestamp {
	return claude.Timestamp(time.Now().UnixMilli())
}

func TestDeriveActivityState_EmptyMessages(t *testing.T) {
	if got := DeriveActivityState(nil); got != ActivityIdle {
		t.Errorf("empty messages: got %q, want %q", got, ActivityIdle)
	}
}

func TestDeriveActivityState_OldTimestamp(t *testing.T) {
	// Messages with timestamps older than 5 minutes should be idle.
	msgs := []claude.Message{
		{Type: claude.MessageTypeUser, Timestamp: claude.Timestamp(1000), Message: &claude.APIMessage{
			Role: "user", Content: []claude.ContentBlock{{Type: "text", Text: "hi"}},
		}},
	}
	if got := DeriveActivityState(msgs); got != ActivityIdle {
		t.Errorf("old timestamp: got %q, want %q", got, ActivityIdle)
	}
}

func TestDeriveActivityState_UserMessage(t *testing.T) {
	msgs := []claude.Message{
		{Type: claude.MessageTypeUser, Timestamp: recentTimestamp(), Message: &claude.APIMessage{
			Role: "user", Content: []claude.ContentBlock{{Type: "text", Text: "do something"}},
		}},
	}
	if got := DeriveActivityState(msgs); got != ActivityWorking {
		t.Errorf("after user message: got %q, want %q", got, ActivityWorking)
	}
}

func TestDeriveActivityState_AssistantTextOnly(t *testing.T) {
	ts := recentTimestamp()
	msgs := []claude.Message{
		{Type: claude.MessageTypeUser, Timestamp: ts, Message: &claude.APIMessage{
			Role: "user", Content: []claude.ContentBlock{{Type: "text", Text: "hi"}},
		}},
		{Type: claude.MessageTypeAssistant, Timestamp: ts, Message: &claude.APIMessage{
			Role: "assistant", Content: []claude.ContentBlock{{Type: "text", Text: "done"}},
		}},
	}
	if got := DeriveActivityState(msgs); got != ActivityWaitingForInput {
		t.Errorf("assistant text only: got %q, want %q", got, ActivityWaitingForInput)
	}
}

func TestDeriveActivityState_AssistantToolUseNoResult(t *testing.T) {
	ts := recentTimestamp()
	msgs := []claude.Message{
		{Type: claude.MessageTypeUser, Timestamp: ts, Message: &claude.APIMessage{
			Role: "user", Content: []claude.ContentBlock{{Type: "text", Text: "hi"}},
		}},
		{Type: claude.MessageTypeAssistant, Timestamp: ts, Message: &claude.APIMessage{
			Role: "assistant", Content: []claude.ContentBlock{{Type: "tool_use", ID: "tu1", Name: "Read"}},
		}},
	}
	if got := DeriveActivityState(msgs); got != ActivityWaitingForApproval {
		t.Errorf("tool_use without result: got %q, want %q", got, ActivityWaitingForApproval)
	}
}

func TestDeriveActivityState_AssistantToolUseWithResult(t *testing.T) {
	ts := recentTimestamp()
	msgs := []claude.Message{
		{Type: claude.MessageTypeUser, Timestamp: ts, Message: &claude.APIMessage{
			Role: "user", Content: []claude.ContentBlock{{Type: "text", Text: "hi"}},
		}},
		{Type: claude.MessageTypeAssistant, Timestamp: ts, Message: &claude.APIMessage{
			Role: "assistant", Content: []claude.ContentBlock{{Type: "tool_use", ID: "tu1", Name: "Read"}},
		}},
		{Type: claude.MessageTypeUser, Timestamp: ts, Message: &claude.APIMessage{
			Role: "user", Content: []claude.ContentBlock{{Type: "tool_result", ToolUseID: "tu1"}},
		}},
	}
	if got := DeriveActivityState(msgs); got != ActivityWorking {
		t.Errorf("tool_use with result: got %q, want %q", got, ActivityWorking)
	}
}

func TestDeriveActivityState_ProgressMessage(t *testing.T) {
	ts := recentTimestamp()
	msgs := []claude.Message{
		{Type: claude.MessageTypeProgress, Timestamp: ts},
	}
	if got := DeriveActivityState(msgs); got != ActivityWorking {
		t.Errorf("progress message: got %q, want %q", got, ActivityWorking)
	}
}

func TestDeriveActivityState_ResultMessage(t *testing.T) {
	ts := recentTimestamp()
	msgs := []claude.Message{
		{Type: claude.MessageTypeUser, Timestamp: ts, Message: &claude.APIMessage{
			Role: "user", Content: []claude.ContentBlock{{Type: "text", Text: "hi"}},
		}},
		{Type: claude.MessageTypeResult, Timestamp: ts},
	}
	if got := DeriveActivityState(msgs); got != ActivityIdle {
		t.Errorf("result message: got %q, want %q", got, ActivityIdle)
	}
}

func TestDeriveActivityState_SkipsSystemMessages(t *testing.T) {
	ts := recentTimestamp()
	msgs := []claude.Message{
		{Type: claude.MessageTypeUser, Timestamp: ts, Message: &claude.APIMessage{
			Role: "user", Content: []claude.ContentBlock{{Type: "text", Text: "hi"}},
		}},
		{Type: claude.MessageTypeSystem, Timestamp: ts},
		{Type: claude.MessageTypeFileHistorySnapshot, Timestamp: ts},
		{Type: claude.MessageTypeCustomTitle, Timestamp: ts},
	}
	// Should skip system/snapshot/custom-title and find the user message.
	if got := DeriveActivityState(msgs); got != ActivityWorking {
		t.Errorf("skips non-semantic: got %q, want %q", got, ActivityWorking)
	}
}

func TestDeriveActivityState_SkipsSidechainMessages(t *testing.T) {
	ts := recentTimestamp()
	msgs := []claude.Message{
		{Type: claude.MessageTypeUser, Timestamp: ts, Message: &claude.APIMessage{
			Role: "user", Content: []claude.ContentBlock{{Type: "text", Text: "do something"}},
		}},
		{Type: claude.MessageTypeAssistant, Timestamp: ts, Message: &claude.APIMessage{
			Role: "assistant", Content: []claude.ContentBlock{{Type: "tool_use", ID: "tu1", Name: "Agent"}},
		}},
		{Type: claude.MessageTypeUser, Timestamp: ts, Message: &claude.APIMessage{
			Role: "user", Content: []claude.ContentBlock{{Type: "tool_result", ToolUseID: "tu1"}},
		}},
		// Sidechain assistant text message — should be skipped.
		{Type: claude.MessageTypeAssistant, Timestamp: ts, IsSidechain: true, Message: &claude.APIMessage{
			Role: "assistant", Content: []claude.ContentBlock{{Type: "text", Text: "subagent done"}},
		}},
	}
	// Should skip the sidechain message and find the user tool_result → working.
	if got := DeriveActivityState(msgs); got != ActivityWorking {
		t.Errorf("sidechain assistant text: got %q, want %q", got, ActivityWorking)
	}
}

func TestDeriveActivityState_SkipsMetaMessages(t *testing.T) {
	ts := recentTimestamp()
	msgs := []claude.Message{
		{Type: claude.MessageTypeUser, Timestamp: ts, Message: &claude.APIMessage{
			Role: "user", Content: []claude.ContentBlock{{Type: "text", Text: "do something"}},
		}},
		// Meta user message (e.g. skill prompt) — should be skipped.
		{Type: claude.MessageTypeUser, Timestamp: ts, IsMeta: true, Message: &claude.APIMessage{
			Role: "user", Content: []claude.ContentBlock{{Type: "text", Text: "skill instructions"}},
		}},
	}
	// Should skip the meta message and find the regular user message → working.
	if got := DeriveActivityState(msgs); got != ActivityWorking {
		t.Errorf("meta user message: got %q, want %q", got, ActivityWorking)
	}
}

func TestDeriveActivityState_SkipsPermissionModeAndAttachment(t *testing.T) {
	ts := recentTimestamp()
	msgs := []claude.Message{
		{Type: claude.MessageTypeUser, Timestamp: ts, Message: &claude.APIMessage{
			Role: "user", Content: []claude.ContentBlock{{Type: "text", Text: "hi"}},
		}},
		{Type: claude.MessageTypePermissionMode, Timestamp: ts},
		{Type: claude.MessageTypeAttachment, Timestamp: ts},
	}
	// Should skip permission-mode and attachment, find the user message.
	if got := DeriveActivityState(msgs); got != ActivityWorking {
		t.Errorf("skips permission-mode/attachment: got %q, want %q", got, ActivityWorking)
	}
}

func TestDeriveActivityState_OnlySystemMessages(t *testing.T) {
	ts := recentTimestamp()
	msgs := []claude.Message{
		{Type: claude.MessageTypeSystem, Timestamp: ts},
		{Type: claude.MessageTypeFileHistorySnapshot, Timestamp: ts},
	}
	if got := DeriveActivityState(msgs); got != ActivityIdle {
		t.Errorf("only system messages: got %q, want %q", got, ActivityIdle)
	}
}

func TestDeriveActivityState_AssistantNilMessage(t *testing.T) {
	ts := recentTimestamp()
	msgs := []claude.Message{
		{Type: claude.MessageTypeUser, Timestamp: ts, Message: &claude.APIMessage{
			Role: "user", Content: []claude.ContentBlock{{Type: "text", Text: "hi"}},
		}},
		{Type: claude.MessageTypeAssistant, Timestamp: ts, Message: nil},
	}
	// Should skip the nil-message assistant and find the user message.
	if got := DeriveActivityState(msgs); got != ActivityWorking {
		t.Errorf("assistant nil message: got %q, want %q", got, ActivityWorking)
	}
}

// --- DeriveActivityStateFromMessage tests ---

func TestDeriveActivityStateFromMessage_User(t *testing.T) {
	msg := claude.Message{
		Type: claude.MessageTypeUser,
		Message: &claude.APIMessage{
			Role: "user", Content: []claude.ContentBlock{{Type: "text", Text: "hi"}},
		},
	}
	if got := DeriveActivityStateFromMessage(msg); got != ActivityWorking {
		t.Errorf("user message: got %q, want %q", got, ActivityWorking)
	}
}

func TestDeriveActivityStateFromMessage_UserToolResult(t *testing.T) {
	msg := claude.Message{
		Type: claude.MessageTypeUser,
		Message: &claude.APIMessage{
			Role: "user", Content: []claude.ContentBlock{{Type: "tool_result", ToolUseID: "tu1"}},
		},
	}
	if got := DeriveActivityStateFromMessage(msg); got != ActivityWorking {
		t.Errorf("user tool_result: got %q, want %q", got, ActivityWorking)
	}
}

func TestDeriveActivityStateFromMessage_AssistantText(t *testing.T) {
	msg := claude.Message{
		Type: claude.MessageTypeAssistant,
		Message: &claude.APIMessage{
			Role: "assistant", Content: []claude.ContentBlock{{Type: "text", Text: "done"}},
		},
	}
	if got := DeriveActivityStateFromMessage(msg); got != ActivityWaitingForInput {
		t.Errorf("assistant text: got %q, want %q", got, ActivityWaitingForInput)
	}
}

func TestDeriveActivityStateFromMessage_AssistantToolUse(t *testing.T) {
	msg := claude.Message{
		Type: claude.MessageTypeAssistant,
		Message: &claude.APIMessage{
			Role: "assistant", Content: []claude.ContentBlock{{Type: "tool_use", ID: "tu1", Name: "Read"}},
		},
	}
	if got := DeriveActivityStateFromMessage(msg); got != ActivityWaitingForApproval {
		t.Errorf("assistant tool_use: got %q, want %q", got, ActivityWaitingForApproval)
	}
}

func TestDeriveActivityStateFromMessage_Progress(t *testing.T) {
	msg := claude.Message{Type: claude.MessageTypeProgress}
	if got := DeriveActivityStateFromMessage(msg); got != ActivityWorking {
		t.Errorf("progress: got %q, want %q", got, ActivityWorking)
	}
}

func TestDeriveActivityStateFromMessage_Result(t *testing.T) {
	msg := claude.Message{Type: claude.MessageTypeResult}
	if got := DeriveActivityStateFromMessage(msg); got != ActivityIdle {
		t.Errorf("result: got %q, want %q", got, ActivityIdle)
	}
}

func TestDeriveActivityStateFromMessage_System(t *testing.T) {
	msg := claude.Message{Type: claude.MessageTypeSystem}
	if got := DeriveActivityStateFromMessage(msg); got != "" {
		t.Errorf("system: got %q, want empty string", got)
	}
}

func TestDeriveActivityStateFromMessage_PermissionMode(t *testing.T) {
	msg := claude.Message{Type: claude.MessageTypePermissionMode}
	if got := DeriveActivityStateFromMessage(msg); got != "" {
		t.Errorf("permission-mode: got %q, want empty string", got)
	}
}

func TestDeriveActivityStateFromMessage_Attachment(t *testing.T) {
	msg := claude.Message{Type: claude.MessageTypeAttachment}
	if got := DeriveActivityStateFromMessage(msg); got != "" {
		t.Errorf("attachment: got %q, want empty string", got)
	}
}

func TestDeriveActivityStateFromMessage_Sidechain(t *testing.T) {
	msg := claude.Message{
		Type:        claude.MessageTypeAssistant,
		IsSidechain: true,
		Message: &claude.APIMessage{
			Role: "assistant", Content: []claude.ContentBlock{{Type: "text", Text: "subagent text"}},
		},
	}
	if got := DeriveActivityStateFromMessage(msg); got != "" {
		t.Errorf("sidechain assistant: got %q, want empty string", got)
	}
}

func TestDeriveActivityStateFromMessage_Meta(t *testing.T) {
	msg := claude.Message{
		Type:   claude.MessageTypeUser,
		IsMeta: true,
		Message: &claude.APIMessage{
			Role: "user", Content: []claude.ContentBlock{{Type: "text", Text: "skill prompt"}},
		},
	}
	if got := DeriveActivityStateFromMessage(msg); got != "" {
		t.Errorf("meta user: got %q, want empty string", got)
	}
}
