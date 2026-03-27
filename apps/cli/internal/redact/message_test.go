package redact

import (
	"testing"

	"github.com/driangle/vibeview/internal/claude"
)

func TestRedactAPIMessage_Nil(t *testing.T) {
	if got := RedactAPIMessage(nil); got != nil {
		t.Errorf("RedactAPIMessage(nil) = %v, want nil", got)
	}
}

func TestRedactAPIMessage_TextBlock(t *testing.T) {
	msg := &claude.APIMessage{
		Role: "assistant",
		Content: []claude.ContentBlock{
			{Type: "text", Text: "Use API_KEY=sk-secret123 to authenticate"},
		},
	}
	got := RedactAPIMessage(msg)

	// Original should be unchanged.
	if msg.Content[0].Text != "Use API_KEY=sk-secret123 to authenticate" {
		t.Fatal("original message was mutated")
	}

	want := "Use API_KEY=[REDACTED] to authenticate"
	if got.Content[0].Text != want {
		t.Errorf("text = %q, want %q", got.Content[0].Text, want)
	}
}

func TestRedactAPIMessage_ToolUseInput(t *testing.T) {
	msg := &claude.APIMessage{
		Role: "assistant",
		Content: []claude.ContentBlock{
			{
				Type: "tool_use",
				Name: "Bash",
				Input: map[string]any{
					"command": "curl -H \"Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.abc\" https://api.example.com",
				},
			},
		},
	}
	got := RedactAPIMessage(msg)

	cmd := got.Content[0].Input["command"].(string)
	want := `curl -H "Authorization: Bearer [REDACTED]" https://api.example.com`
	if cmd != want {
		t.Errorf("input command = %q, want %q", cmd, want)
	}
}

func TestRedactAPIMessage_ToolResultContent(t *testing.T) {
	msg := &claude.APIMessage{
		Role: "user",
		Content: []claude.ContentBlock{
			{
				Type:      "tool_result",
				ToolUseID: "123",
				Content:   "ANTHROPIC_API_KEY=sk-ant-secret output",
			},
		},
	}
	got := RedactAPIMessage(msg)

	content := got.Content[0].Content.(string)
	want := "ANTHROPIC_API_KEY=[REDACTED] output"
	if content != want {
		t.Errorf("tool_result content = %q, want %q", content, want)
	}
}

func TestRedactAPIMessage_ThinkingBlock(t *testing.T) {
	msg := &claude.APIMessage{
		Role: "assistant",
		Content: []claude.ContentBlock{
			{Type: "thinking", Thinking: "The user's postgres://admin:hunter2@db.local/app connection string"},
		},
	}
	got := RedactAPIMessage(msg)

	want := "The user's postgres://admin:[REDACTED]@db.local/app connection string"
	if got.Content[0].Thinking != want {
		t.Errorf("thinking = %q, want %q", got.Content[0].Thinking, want)
	}
}

func TestRedactAPIMessage_PreservesNonSensitive(t *testing.T) {
	msg := &claude.APIMessage{
		Role:  "assistant",
		Model: "claude-sonnet-4-20250514",
		Content: []claude.ContentBlock{
			{Type: "text", Text: "Here is some safe content"},
		},
		Usage: &claude.Usage{InputTokens: 100, OutputTokens: 50},
	}
	got := RedactAPIMessage(msg)

	if got.Role != "assistant" {
		t.Errorf("role = %q, want assistant", got.Role)
	}
	if got.Model != "claude-sonnet-4-20250514" {
		t.Errorf("model changed")
	}
	if got.Content[0].Text != "Here is some safe content" {
		t.Errorf("safe text was modified")
	}
	if got.Usage.InputTokens != 100 {
		t.Errorf("usage was modified")
	}
}

func TestRedactMapValues(t *testing.T) {
	m := map[string]any{
		"output":  "SECRET_KEY=mysecret123 done",
		"status":  "success",
		"code":    42,
		"nested":  map[string]any{"token": "Bearer eyJhbGciOiJIUzI1NiJ9.longtoken.sig"},
		"items":   []any{"GITHUB_TOKEN=ghp_abc123", "safe string"},
		"nothing": nil,
	}

	got := RedactMapValues(m)

	// Original unchanged.
	if m["output"] != "SECRET_KEY=mysecret123 done" {
		t.Fatal("original map was mutated")
	}

	if got["output"] != "SECRET_KEY=[REDACTED] done" {
		t.Errorf("output = %q", got["output"])
	}
	if got["status"] != "success" {
		t.Errorf("status changed")
	}
	if got["code"] != 42 {
		t.Errorf("code changed")
	}

	nested := got["nested"].(map[string]any)
	if nested["token"] != "Bearer [REDACTED]" {
		t.Errorf("nested token = %q", nested["token"])
	}

	items := got["items"].([]any)
	if items[0] != "GITHUB_TOKEN=[REDACTED]" {
		t.Errorf("items[0] = %q", items[0])
	}
	if items[1] != "safe string" {
		t.Errorf("items[1] changed")
	}
}

func TestRedactMapValues_Nil(t *testing.T) {
	if got := RedactMapValues(nil); got != nil {
		t.Errorf("RedactMapValues(nil) = %v, want nil", got)
	}
}
