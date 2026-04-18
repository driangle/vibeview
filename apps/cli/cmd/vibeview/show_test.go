package main

import (
	"bytes"
	"strings"
	"testing"

	"github.com/driangle/vibeview/internal/claude"
)

func init() {
	// Disable color for all show tests to simplify assertions.
	colorEnabled = false
}

func TestRenderShow_BasicConversation(t *testing.T) {
	messages := []claude.Message{
		{
			Type: claude.MessageTypeUser,
			Message: &claude.APIMessage{
				Role:    "user",
				Content: []claude.ContentBlock{{Type: "text", Text: "Help me fix the login page"}},
			},
		},
		{
			Type: claude.MessageTypeAssistant,
			Message: &claude.APIMessage{
				Role:    "assistant",
				Content: []claude.ContentBlock{{Type: "text", Text: "I'll help you fix the login page."}},
			},
		},
	}

	var buf bytes.Buffer
	renderShow(&buf, messages, showOptions{})
	output := buf.String()

	if !strings.Contains(output, "--- User ---") {
		t.Error("expected User label")
	}
	if !strings.Contains(output, "--- Assistant ---") {
		t.Error("expected Assistant label")
	}
	if !strings.Contains(output, "Help me fix the login page") {
		t.Error("expected user message text")
	}
	if !strings.Contains(output, "I'll help you fix the login page.") {
		t.Error("expected assistant message text")
	}
}

func TestRenderShow_ToolCalls(t *testing.T) {
	messages := []claude.Message{
		{
			Type: claude.MessageTypeAssistant,
			Message: &claude.APIMessage{
				Role: "assistant",
				Content: []claude.ContentBlock{
					{Type: "tool_use", ID: "tu-1", Name: "Read", Input: map[string]any{"file_path": "src/main.ts"}},
					{Type: "tool_use", ID: "tu-2", Name: "Bash", Input: map[string]any{"command": "npm test"}},
				},
			},
		},
		{
			Type: claude.MessageTypeUser,
			Message: &claude.APIMessage{
				Role: "user",
				Content: []claude.ContentBlock{
					{Type: "tool_result", ToolUseID: "tu-1", Content: "file contents"},
					{Type: "tool_result", ToolUseID: "tu-2", Content: "FAIL", IsError: true},
				},
			},
		},
	}

	var buf bytes.Buffer
	renderShow(&buf, messages, showOptions{})
	output := buf.String()

	if !strings.Contains(output, "[Tool]") {
		t.Error("expected [Tool] label")
	}
	if !strings.Contains(output, "Read") {
		t.Error("expected Read tool name")
	}
	if !strings.Contains(output, "src/main.ts") {
		t.Error("expected file path argument")
	}
	if !strings.Contains(output, "✓") {
		t.Error("expected success indicator for Read")
	}
	if !strings.Contains(output, "✗") {
		t.Error("expected failure indicator for Bash")
	}
}

func TestRenderShow_ThinkingBlocks(t *testing.T) {
	messages := []claude.Message{
		{
			Type: claude.MessageTypeAssistant,
			Message: &claude.APIMessage{
				Role: "assistant",
				Content: []claude.ContentBlock{
					{Type: "thinking", Thinking: "Let me think about this..."},
					{Type: "text", Text: "Here's my answer."},
				},
			},
		},
	}

	// Without --thinking flag: should not show thinking.
	var buf bytes.Buffer
	renderShow(&buf, messages, showOptions{thinking: false})
	if strings.Contains(buf.String(), "Let me think about this") {
		t.Error("thinking block should be hidden by default")
	}

	// With --thinking flag: should show thinking.
	buf.Reset()
	renderShow(&buf, messages, showOptions{thinking: true})
	output := buf.String()
	if !strings.Contains(output, "[Thinking]") {
		t.Error("expected [Thinking] label")
	}
	if !strings.Contains(output, "Let me think about this") {
		t.Error("expected thinking content")
	}
}

func TestRenderShow_VerboseToolCalls(t *testing.T) {
	messages := []claude.Message{
		{
			Type: claude.MessageTypeAssistant,
			Message: &claude.APIMessage{
				Role: "assistant",
				Content: []claude.ContentBlock{
					{Type: "tool_use", ID: "tu-1", Name: "Read", Input: map[string]any{"file_path": "src/main.ts"}},
				},
			},
		},
		{
			Type: claude.MessageTypeUser,
			Message: &claude.APIMessage{
				Role: "user",
				Content: []claude.ContentBlock{
					{Type: "tool_result", ToolUseID: "tu-1", Content: "package main\nfunc main() {}"},
				},
			},
		},
	}

	var buf bytes.Buffer
	renderShow(&buf, messages, showOptions{verbose: true})
	output := buf.String()

	if !strings.Contains(output, "Input:") {
		t.Error("expected Input label in verbose mode")
	}
	if !strings.Contains(output, "Output:") {
		t.Error("expected Output label in verbose mode")
	}
	if !strings.Contains(output, "package main") {
		t.Error("expected tool output content in verbose mode")
	}
}

func TestRenderShow_SkipsMetaAndProgress(t *testing.T) {
	messages := []claude.Message{
		{Type: claude.MessageTypeProgress, Data: map[string]any{"type": "agent_progress"}},
		{Type: claude.MessageTypeSystem, Content: "system message"},
		{Type: claude.MessageTypeUser, IsMeta: true, Message: &claude.APIMessage{
			Role:    "user",
			Content: []claude.ContentBlock{{Type: "text", Text: "meta message"}},
		}},
		{Type: claude.MessageTypeFileHistorySnapshot},
		{Type: claude.MessageTypeResult},
		{Type: claude.MessageTypeUser, Message: &claude.APIMessage{
			Role:    "user",
			Content: []claude.ContentBlock{{Type: "text", Text: "real message"}},
		}},
	}

	var buf bytes.Buffer
	renderShow(&buf, messages, showOptions{})
	output := buf.String()

	if strings.Contains(output, "system message") {
		t.Error("system messages should be skipped")
	}
	if strings.Contains(output, "meta message") {
		t.Error("meta messages should be skipped")
	}
	if !strings.Contains(output, "real message") {
		t.Error("expected real user message")
	}
}

func TestRenderShow_Subagent(t *testing.T) {
	messages := []claude.Message{
		{
			Type: claude.MessageTypeAssistant,
			Message: &claude.APIMessage{
				Role: "assistant",
				Content: []claude.ContentBlock{
					{Type: "tool_use", ID: "tu-1", Name: "Agent", Input: map[string]any{
						"description": "Search for bugs",
						"prompt":      "Find all bugs in the codebase",
					}},
				},
			},
		},
		{
			Type: claude.MessageTypeUser,
			Message: &claude.APIMessage{
				Role: "user",
				Content: []claude.ContentBlock{
					{Type: "tool_result", ToolUseID: "tu-1", Content: "No bugs found."},
				},
			},
		},
	}

	var buf bytes.Buffer
	renderShow(&buf, messages, showOptions{})
	output := buf.String()

	if !strings.Contains(output, "Agent") {
		t.Error("expected Agent tool name")
	}
	if !strings.Contains(output, "Search for bugs") {
		t.Error("expected agent description")
	}
}

func TestRenderShow_UserToolResultsNotRendered(t *testing.T) {
	// User messages containing only tool_result blocks should not render as "User" messages.
	messages := []claude.Message{
		{
			Type: claude.MessageTypeAssistant,
			Message: &claude.APIMessage{
				Role: "assistant",
				Content: []claude.ContentBlock{
					{Type: "tool_use", ID: "tu-1", Name: "Read", Input: map[string]any{"file_path": "a.go"}},
				},
			},
		},
		{
			Type: claude.MessageTypeUser,
			Message: &claude.APIMessage{
				Role: "user",
				Content: []claude.ContentBlock{
					{Type: "tool_result", ToolUseID: "tu-1", Content: "file contents"},
				},
			},
		},
	}

	var buf bytes.Buffer
	renderShow(&buf, messages, showOptions{})
	output := buf.String()

	// Should show tool call summary but no "--- User ---" for tool result messages.
	userCount := strings.Count(output, "--- User ---")
	if userCount != 0 {
		t.Errorf("expected 0 User labels for tool-result-only messages, got %d", userCount)
	}
}

func TestFormatToolSummary(t *testing.T) {
	tests := []struct {
		name      string
		block     claude.ContentBlock
		result    claude.ContentBlock
		hasResult bool
		wantParts []string
	}{
		{
			name:      "Read success",
			block:     claude.ContentBlock{Type: "tool_use", ID: "1", Name: "Read", Input: map[string]any{"file_path": "src/main.ts"}},
			result:    claude.ContentBlock{Type: "tool_result", ToolUseID: "1", Content: "ok"},
			hasResult: true,
			wantParts: []string{"[Tool]", "Read", "src/main.ts", "✓"},
		},
		{
			name:      "Bash failure",
			block:     claude.ContentBlock{Type: "tool_use", ID: "2", Name: "Bash", Input: map[string]any{"command": "npm test"}},
			result:    claude.ContentBlock{Type: "tool_result", ToolUseID: "2", Content: "FAIL", IsError: true},
			hasResult: true,
			wantParts: []string{"[Tool]", "Bash", "npm test", "✗"},
		},
		{
			name:      "Edit success",
			block:     claude.ContentBlock{Type: "tool_use", ID: "3", Name: "Edit", Input: map[string]any{"file_path": "src/auth.go"}},
			result:    claude.ContentBlock{Type: "tool_result", ToolUseID: "3", Content: "edited"},
			hasResult: true,
			wantParts: []string{"Edit", "src/auth.go", "✓"},
		},
		{
			name:      "Grep pattern",
			block:     claude.ContentBlock{Type: "tool_use", ID: "4", Name: "Grep", Input: map[string]any{"pattern": "TODO"}},
			result:    claude.ContentBlock{Type: "tool_result", ToolUseID: "4", Content: "found"},
			hasResult: true,
			wantParts: []string{"Grep", "TODO", "✓"},
		},
		{
			name:      "Agent with description",
			block:     claude.ContentBlock{Type: "tool_use", ID: "5", Name: "Agent", Input: map[string]any{"description": "Bug search", "prompt": "find bugs"}},
			result:    claude.ContentBlock{Type: "tool_result", ToolUseID: "5", Content: "done"},
			hasResult: true,
			wantParts: []string{"Agent", "Bug search", "✓"},
		},
		{
			name:      "no result",
			block:     claude.ContentBlock{Type: "tool_use", ID: "6", Name: "Read", Input: map[string]any{"file_path": "x.go"}},
			hasResult: false,
			wantParts: []string{"Read", "x.go", "-"},
		},
		{
			name:      "Skill tool",
			block:     claude.ContentBlock{Type: "tool_use", ID: "7", Name: "Skill", Input: map[string]any{"skill": "commit"}},
			result:    claude.ContentBlock{Type: "tool_result", ToolUseID: "7", Content: "ok"},
			hasResult: true,
			wantParts: []string{"Skill", "commit", "✓"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := formatToolSummary(tt.block, tt.result, tt.hasResult)
			for _, part := range tt.wantParts {
				if !strings.Contains(got, part) {
					t.Errorf("formatToolSummary() = %q, missing %q", got, part)
				}
			}
		})
	}
}

func TestFormatToolSummary_LongCommandTruncated(t *testing.T) {
	longCmd := strings.Repeat("x", 100)
	block := claude.ContentBlock{
		Type:  "tool_use",
		ID:    "1",
		Name:  "Bash",
		Input: map[string]any{"command": longCmd},
	}
	result := claude.ContentBlock{Type: "tool_result", ToolUseID: "1", Content: "ok"}
	got := formatToolSummary(block, result, true)

	// The quoted command + truncation should be <= 60 chars for the arg portion.
	if len(got) > 200 {
		t.Errorf("summary too long (%d chars): %q", len(got), got)
	}
	if !strings.Contains(got, "...") {
		t.Error("expected truncation indicator")
	}
}

func TestFilterConversationMessages(t *testing.T) {
	messages := []claude.Message{
		{Type: claude.MessageTypeUser, Message: &claude.APIMessage{Role: "user"}},
		{Type: claude.MessageTypeProgress},
		{Type: claude.MessageTypeAssistant, Message: &claude.APIMessage{Role: "assistant"}},
		{Type: claude.MessageTypeSystem},
		{Type: claude.MessageTypeUser, IsMeta: true, Message: &claude.APIMessage{Role: "user"}},
	}

	filtered := filterConversationMessages(messages)
	if len(filtered) != 2 {
		t.Errorf("expected 2 messages, got %d", len(filtered))
	}
}

func TestRenderShow_SidechainSkipped(t *testing.T) {
	messages := []claude.Message{
		{
			Type:        claude.MessageTypeAssistant,
			IsSidechain: true,
			Message: &claude.APIMessage{
				Role:    "assistant",
				Content: []claude.ContentBlock{{Type: "text", Text: "sidechain response"}},
			},
		},
		{
			Type: claude.MessageTypeUser,
			Message: &claude.APIMessage{
				Role:    "user",
				Content: []claude.ContentBlock{{Type: "text", Text: "main message"}},
			},
		},
	}

	var buf bytes.Buffer
	renderShow(&buf, messages, showOptions{})
	output := buf.String()

	if strings.Contains(output, "sidechain response") {
		t.Error("sidechain messages should be skipped")
	}
	if !strings.Contains(output, "main message") {
		t.Error("expected main message")
	}
}
