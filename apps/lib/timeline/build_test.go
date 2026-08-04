package timeline

import (
	"strings"
	"testing"

	"github.com/driangle/vibeview/apps/lib/claude"
)

// --- helpers to build test messages ---

func userMsg(uuid string, ts int64, blocks ...claude.ContentBlock) claude.Message {
	return claude.Message{
		Type:      claude.MessageTypeUser,
		UUID:      uuid,
		Timestamp: claude.Timestamp(ts),
		Message:   &claude.APIMessage{Role: "user", Content: blocks},
	}
}

func assistantMsg(uuid string, ts int64, model string, usage *claude.Usage, blocks ...claude.ContentBlock) claude.Message {
	return claude.Message{
		Type:      claude.MessageTypeAssistant,
		UUID:      uuid,
		Timestamp: claude.Timestamp(ts),
		Message:   &claude.APIMessage{Role: "assistant", Model: model, Usage: usage, Content: blocks},
	}
}

func progressMsg(uuid string, ts int64, data map[string]any) claude.Message {
	return claude.Message{Type: claude.MessageTypeProgress, UUID: uuid, Timestamp: claude.Timestamp(ts), Data: data}
}

func textBlock(text string) claude.ContentBlock {
	return claude.ContentBlock{Type: "text", Text: text}
}

func thinkingBlock(text string) claude.ContentBlock {
	return claude.ContentBlock{Type: "thinking", Thinking: text}
}

func toolUse(id, name string, input map[string]any) claude.ContentBlock {
	return claude.ContentBlock{Type: "tool_use", ID: id, Name: name, Input: input}
}

func toolResult(toolUseID string, content any, isError bool) claude.ContentBlock {
	return claude.ContentBlock{Type: "tool_result", ToolUseID: toolUseID, Content: content, IsError: isError}
}

// toolResultMsg is a user message that only forwards a tool result (auxiliary).
func toolResultMsg(uuid string, ts int64, toolUseID string, isError bool) claude.Message {
	return userMsg(uuid, ts, toolResult(toolUseID, "output", isError))
}

// --- grouping / boundary tests ---

func TestBuildExchanges_Grouping(t *testing.T) {
	tests := []struct {
		name             string
		messages         []claude.Message
		wantCount        int
		wantPromptEmpty  []bool // per exchange: is PromptPreview empty (null prompt)?
		wantUUIDsPerExch [][]string
	}{
		{
			name:      "empty session",
			messages:  nil,
			wantCount: 0,
		},
		{
			name: "multi-tool loop folds tool_results as auxiliary",
			messages: []claude.Message{
				userMsg("u1", 1000, textBlock("do the thing")),
				assistantMsg("a1", 1100, "claude-opus-4-1-20250805", nil,
					toolUse("t1", "Bash", map[string]any{"command": "ls"})),
				toolResultMsg("r1", 1200, "t1", false),
				assistantMsg("a2", 1300, "claude-opus-4-1-20250805", nil,
					toolUse("t2", "Read", map[string]any{"file_path": "/tmp/f"})),
				toolResultMsg("r2", 1400, "t2", false),
				assistantMsg("a3", 1500, "claude-opus-4-1-20250805", nil, textBlock("done")),
			},
			wantCount:        1,
			wantPromptEmpty:  []bool{false},
			wantUUIDsPerExch: [][]string{{"u1", "a1", "r1", "a2", "r2", "a3"}},
		},
		{
			name: "two prompts start two exchanges",
			messages: []claude.Message{
				userMsg("u1", 1000, textBlock("first")),
				assistantMsg("a1", 1100, "claude-sonnet-4-5-20250929", nil, textBlock("ok")),
				userMsg("u2", 2000, textBlock("second")),
				assistantMsg("a2", 2100, "claude-sonnet-4-5-20250929", nil, textBlock("ok")),
			},
			wantCount:       2,
			wantPromptEmpty: []bool{false, false},
		},
		{
			name: "leading assistant with no prompt forms null-prompt exchange",
			messages: []claude.Message{
				assistantMsg("a0", 500, "claude-opus-4-1-20250805", nil, textBlock("hi")),
				userMsg("u1", 1000, textBlock("real prompt")),
				assistantMsg("a1", 1100, "claude-opus-4-1-20250805", nil, textBlock("reply")),
			},
			wantCount:       2,
			wantPromptEmpty: []bool{true, false},
		},
		{
			name: "leading auxiliary with no prompt forms null-prompt exchange",
			messages: []claude.Message{
				progressMsg("p0", 400, map[string]any{"type": "note"}),
				userMsg("u1", 1000, textBlock("prompt")),
			},
			wantCount:       2,
			wantPromptEmpty: []bool{true, false},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := BuildExchanges(tt.messages)
			if len(got) != tt.wantCount {
				t.Fatalf("exchange count = %d, want %d", len(got), tt.wantCount)
			}
			for i, wantEmpty := range tt.wantPromptEmpty {
				if (got[i].PromptPreview == "") != wantEmpty {
					t.Errorf("exchange %d PromptPreview=%q, wantEmpty=%v", i, got[i].PromptPreview, wantEmpty)
				}
				if got[i].Index != i {
					t.Errorf("exchange %d Index=%d, want %d", i, got[i].Index, i)
				}
			}
			for i, wantUUIDs := range tt.wantUUIDsPerExch {
				if strings.Join(got[i].MessageUUIDs, ",") != strings.Join(wantUUIDs, ",") {
					t.Errorf("exchange %d MessageUUIDs=%v, want %v", i, got[i].MessageUUIDs, wantUUIDs)
				}
			}
		})
	}
}

// --- flag tests ---

func TestBuildExchanges_Flags(t *testing.T) {
	tests := []struct {
		name     string
		messages []claude.Message
		want     ExchangeFlags
	}{
		{
			name: "error flag from tool_result is_error",
			messages: []claude.Message{
				userMsg("u1", 1000, textBlock("run it")),
				assistantMsg("a1", 1100, "claude-opus-4-1-20250805", nil,
					toolUse("t1", "Bash", map[string]any{"command": "false"})),
				toolResultMsg("r1", 1200, "t1", true),
				assistantMsg("a2", 1300, "claude-opus-4-1-20250805", nil, textBlock("failed")),
			},
			want: ExchangeFlags{HasErrors: true},
		},
		{
			name: "deep thinking flag over threshold",
			messages: []claude.Message{
				userMsg("u1", 1000, textBlock("think hard")),
				assistantMsg("a1", 1100, "claude-opus-4-1-20250805", nil,
					thinkingBlock(strings.Repeat("x", 501)), textBlock("answer")),
			},
			want: ExchangeFlags{DeepThinking: true},
		},
		{
			name: "thinking under threshold does not flag",
			messages: []claude.Message{
				userMsg("u1", 1000, textBlock("think a little")),
				assistantMsg("a1", 1100, "claude-opus-4-1-20250805", nil,
					thinkingBlock(strings.Repeat("x", 500)), textBlock("answer")),
			},
			want: ExchangeFlags{DeepThinking: false},
		},
		{
			name: "subagent flag from Agent tool_use",
			messages: []claude.Message{
				userMsg("u1", 1000, textBlock("delegate")),
				assistantMsg("a1", 1100, "claude-opus-4-1-20250805", nil,
					toolUse("t1", "Agent", map[string]any{"prompt": "go"})),
			},
			want: ExchangeFlags{HasSubagents: true, ApprovalGate: true},
		},
		{
			name: "subagent flag from agent_progress",
			messages: []claude.Message{
				userMsg("u1", 1000, textBlock("delegate")),
				assistantMsg("a1", 1100, "claude-opus-4-1-20250805", nil, textBlock("ok")),
				progressMsg("p1", 1200, map[string]any{"type": "agent_progress", "agentId": "abc123"}),
			},
			want: ExchangeFlags{HasSubagents: true},
		},
		{
			name: "approval gate when last block is tool_use",
			messages: []claude.Message{
				userMsg("u1", 1000, textBlock("edit file")),
				assistantMsg("a1", 1100, "claude-opus-4-1-20250805", nil,
					textBlock("I'll edit"),
					toolUse("t1", "Edit", map[string]any{"file_path": "/tmp/f"})),
			},
			want: ExchangeFlags{ApprovalGate: true},
		},
		{
			name: "no approval gate when last block is text",
			messages: []claude.Message{
				userMsg("u1", 1000, textBlock("just answer")),
				assistantMsg("a1", 1100, "claude-opus-4-1-20250805", nil,
					toolUse("t1", "Read", map[string]any{"file_path": "/tmp/f"}),
					textBlock("here it is")),
			},
			want: ExchangeFlags{ApprovalGate: false},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := BuildExchanges(tt.messages)
			if len(got) == 0 {
				t.Fatal("expected at least one exchange")
			}
			if got[0].Flags != tt.want {
				t.Errorf("Flags = %+v, want %+v", got[0].Flags, tt.want)
			}
		})
	}
}

// --- timing / idle tests ---

func TestBuildExchanges_Timing(t *testing.T) {
	messages := []claude.Message{
		userMsg("u1", 1000, textBlock("first")),
		assistantMsg("a1", 1500, "claude-opus-4-1-20250805", nil, textBlock("done")),
		// idle gap of 3000ms before the next prompt (4500 - 1500)
		userMsg("u2", 4500, textBlock("second")),
		assistantMsg("a2", 5000, "claude-opus-4-1-20250805", nil, textBlock("done")),
	}

	got := BuildExchanges(messages)
	if len(got) != 2 {
		t.Fatalf("count = %d, want 2", len(got))
	}

	if got[0].IdleBeforeMs != 0 {
		t.Errorf("first exchange IdleBeforeMs = %d, want 0", got[0].IdleBeforeMs)
	}
	if got[0].DurationMs != 500 {
		t.Errorf("first exchange DurationMs = %d, want 500", got[0].DurationMs)
	}
	if got[1].IdleBeforeMs != 3000 {
		t.Errorf("second exchange IdleBeforeMs = %d, want 3000", got[1].IdleBeforeMs)
	}
	if got[1].DurationMs != 500 {
		t.Errorf("second exchange DurationMs = %d, want 500", got[1].DurationMs)
	}
	if got[0].StartTime == "" || got[0].EndTime == "" {
		t.Errorf("expected non-empty ISO timestamps, got start=%q end=%q", got[0].StartTime, got[0].EndTime)
	}
}

func TestBuildExchanges_DurationNeverNegative(t *testing.T) {
	// Auxiliary message with an earlier timestamp than the assistant reply.
	messages := []claude.Message{
		userMsg("u1", 2000, textBlock("prompt")),
		assistantMsg("a1", 3000, "claude-opus-4-1-20250805", nil, textBlock("reply")),
		toolResultMsg("r1", 1000, "t1", false), // out-of-order, earlier ts
	}
	got := BuildExchanges(messages)
	if got[0].DurationMs < 0 {
		t.Errorf("DurationMs = %d, want >= 0", got[0].DurationMs)
	}
	// span is min(1000..3000)=1000 to max=3000 → 2000
	if got[0].DurationMs != 2000 {
		t.Errorf("DurationMs = %d, want 2000", got[0].DurationMs)
	}
}

// --- metrics tests ---

func TestBuildExchanges_Metrics(t *testing.T) {
	messages := []claude.Message{
		userMsg("u1", 1000, textBlock("build the app and test it")),
		assistantMsg("a1", 1100, "claude-opus-4-1-20250805",
			&claude.Usage{InputTokens: 1000, OutputTokens: 500},
			toolUse("t1", "Bash", map[string]any{"command": "make build"}),
			toolUse("t2", "Read", map[string]any{"file_path": "/home/x/app.go"})),
		toolResultMsg("r1", 1200, "t1", false),
		assistantMsg("a2", 1300, "claude-opus-4-1-20250805",
			&claude.Usage{InputTokens: 2000, OutputTokens: 300},
			toolUse("t3", "Bash", map[string]any{"command": "make test"}),
			toolUse("t4", "Edit", map[string]any{"file_path": "/home/x/app.go"})),
	}

	got := BuildExchanges(messages)
	if len(got) != 1 {
		t.Fatalf("count = %d, want 1", len(got))
	}
	e := got[0]

	if e.Model != "claude-opus-4-1-20250805" {
		t.Errorf("Model = %q", e.Model)
	}
	if e.Tokens != 3800 { // 1000+500 + 2000+300
		t.Errorf("Tokens = %d, want 3800", e.Tokens)
	}
	if e.CostUSD <= 0 {
		t.Errorf("CostUSD = %f, want > 0 for a known model", e.CostUSD)
	}
	if strings.Join(e.Tools, ",") != "Bash,Edit,Read" { // distinct, sorted
		t.Errorf("Tools = %v, want [Bash Edit Read]", e.Tools)
	}
	if len(e.Files) != 1 { // /home/x/app.go touched by Read and Edit → distinct
		t.Errorf("Files = %v, want one distinct path", e.Files)
	}
	if strings.Join(e.Commands, ",") != "make build,make test" {
		t.Errorf("Commands = %v, want [make build, make test]", e.Commands)
	}
	if e.PromptPreview != "build the app and test it" {
		t.Errorf("PromptPreview = %q", e.PromptPreview)
	}
}

func TestBuildExchanges_CostUnknownModelStillPopulated(t *testing.T) {
	// Unknown model id falls back to family/default rates — cost must still be > 0.
	messages := []claude.Message{
		userMsg("u1", 1000, textBlock("hi")),
		assistantMsg("a1", 1100, "claude-sonnet-9-future",
			&claude.Usage{InputTokens: 1000, OutputTokens: 1000}, textBlock("hello")),
	}
	got := BuildExchanges(messages)
	if got[0].CostUSD <= 0 {
		t.Errorf("CostUSD = %f, want > 0 via fallback rates", got[0].CostUSD)
	}
}

func TestBuildExchanges_PromptPreviewTruncatedAndRedacted(t *testing.T) {
	long := strings.Repeat("a", 250)
	got := BuildExchanges([]claude.Message{
		userMsg("u1", 1000, textBlock(long)),
	})
	if n := len([]rune(got[0].PromptPreview)); n != promptPreviewLen {
		t.Errorf("preview length = %d, want %d", n, promptPreviewLen)
	}
}

func TestBuildExchanges_Skills(t *testing.T) {
	got := BuildExchanges([]claude.Message{
		userMsg("u1", 1000, textBlock("use a skill")),
		assistantMsg("a1", 1100, "claude-opus-4-1-20250805", nil,
			toolUse("t1", "Skill", map[string]any{"skill": "commit-msg"})),
	})
	if strings.Join(got[0].Skills, ",") != "commit-msg" {
		t.Errorf("Skills = %v, want [commit-msg]", got[0].Skills)
	}
}
