package claude

import (
	"strings"
	"testing"
)

func TestParseHistoryLine(t *testing.T) {
	t.Run("valid", func(t *testing.T) {
		line := `{"sessionId":"abc-123","project":"/Users/foo/bar","display":"fix bug","timestamp":1700000000}`
		entry, err := ParseHistoryLine([]byte(line))
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if entry.SessionID != "abc-123" {
			t.Errorf("SessionID = %q, want %q", entry.SessionID, "abc-123")
		}
		if entry.Project != "/Users/foo/bar" {
			t.Errorf("Project = %q, want %q", entry.Project, "/Users/foo/bar")
		}
		if entry.Display != "fix bug" {
			t.Errorf("Display = %q, want %q", entry.Display, "fix bug")
		}
		if entry.Timestamp.Int64() != 1700000000 {
			t.Errorf("Timestamp = %d, want %d", entry.Timestamp.Int64(), 1700000000)
		}
	})

	t.Run("malformed", func(t *testing.T) {
		_, err := ParseHistoryLine([]byte(`not json`))
		if err == nil {
			t.Fatal("expected error for malformed input")
		}
	})
}

func TestTimestamp_ISOString(t *testing.T) {
	line := `{"type":"user","uuid":"u1","sessionId":"s1","timestamp":"2026-03-13T10:46:43.165Z","message":{"role":"user","content":[{"type":"text","text":"hello"}]}}`
	msg, err := ParseMessageLine([]byte(line))
	if err != nil {
		t.Fatalf("unexpected error parsing ISO timestamp: %v", err)
	}
	if msg.Timestamp.Int64() == 0 {
		t.Error("expected non-zero timestamp from ISO string")
	}
}

func TestParseMessageLine_User(t *testing.T) {
	line := `{"type":"user","uuid":"u1","parentUuid":"","sessionId":"s1","timestamp":1700000000,"message":{"role":"user","content":[{"type":"text","text":"hello"}]}}`
	msg, err := ParseMessageLine([]byte(line))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if msg.Type != MessageTypeUser {
		t.Errorf("Type = %q, want %q", msg.Type, MessageTypeUser)
	}
	if msg.Message == nil {
		t.Fatal("Message is nil")
	}
	if msg.Message.Role != "user" {
		t.Errorf("Role = %q, want %q", msg.Message.Role, "user")
	}
	if len(msg.Message.Content) != 1 || msg.Message.Content[0].Text != "hello" {
		t.Errorf("unexpected content: %+v", msg.Message.Content)
	}
}

func TestParseMessageLine_Assistant(t *testing.T) {
	line := `{"type":"assistant","uuid":"a1","sessionId":"s1","timestamp":1700000001,"message":{"role":"assistant","model":"claude-sonnet-4-20250514","content":[{"type":"text","text":"hi there"}],"usage":{"input_tokens":100,"output_tokens":50,"cache_creation_input_tokens":10,"cache_read_input_tokens":20,"costUSD":0.0042}}}`
	msg, err := ParseMessageLine([]byte(line))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if msg.Type != MessageTypeAssistant {
		t.Errorf("Type = %q, want %q", msg.Type, MessageTypeAssistant)
	}
	if msg.Message.Model != "claude-sonnet-4-20250514" {
		t.Errorf("Model = %q, want %q", msg.Message.Model, "claude-sonnet-4-20250514")
	}
	u := msg.Message.Usage
	if u == nil {
		t.Fatal("Usage is nil")
	}
	if u.InputTokens != 100 {
		t.Errorf("InputTokens = %d, want 100", u.InputTokens)
	}
	if u.OutputTokens != 50 {
		t.Errorf("OutputTokens = %d, want 50", u.OutputTokens)
	}
	if u.CacheCreationInputTokens != 10 {
		t.Errorf("CacheCreationInputTokens = %d, want 10", u.CacheCreationInputTokens)
	}
	if u.CacheReadInputTokens != 20 {
		t.Errorf("CacheReadInputTokens = %d, want 20", u.CacheReadInputTokens)
	}
	if u.CostUSD != 0.0042 {
		t.Errorf("CostUSD = %f, want 0.0042", u.CostUSD)
	}
}

func TestParseMessageLine_Progress(t *testing.T) {
	line := `{"type":"progress","uuid":"p1","sessionId":"s1","timestamp":1700000002,"toolUseID":"tu1","data":{"status":"running"}}`
	msg, err := ParseMessageLine([]byte(line))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if msg.Type != MessageTypeProgress {
		t.Errorf("Type = %q, want %q", msg.Type, MessageTypeProgress)
	}
	if msg.ToolUseID != "tu1" {
		t.Errorf("ToolUseID = %q, want %q", msg.ToolUseID, "tu1")
	}
	if msg.Data["status"] != "running" {
		t.Errorf("Data[status] = %v, want %q", msg.Data["status"], "running")
	}
}

func TestParseMessageLine_System(t *testing.T) {
	line := `{"type":"system","uuid":"sys1","sessionId":"s1","timestamp":1700000003}`
	msg, err := ParseMessageLine([]byte(line))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if msg.Type != MessageTypeSystem {
		t.Errorf("Type = %q, want %q", msg.Type, MessageTypeSystem)
	}
}

func TestParseMessageLine_FileHistorySnapshot(t *testing.T) {
	line := `{"type":"file-history-snapshot","uuid":"fh1","sessionId":"s1","timestamp":1700000004,"snapshot":{"file.go":"abc123"}}`
	msg, err := ParseMessageLine([]byte(line))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if msg.Type != MessageTypeFileHistorySnapshot {
		t.Errorf("Type = %q, want %q", msg.Type, MessageTypeFileHistorySnapshot)
	}
	if msg.Snapshot["file.go"] != "abc123" {
		t.Errorf("Snapshot[file.go] = %v, want %q", msg.Snapshot["file.go"], "abc123")
	}
}

func TestContentBlock_ToolUse(t *testing.T) {
	line := `{"type":"assistant","uuid":"a2","sessionId":"s1","timestamp":1700000005,"message":{"role":"assistant","content":[{"type":"tool_use","id":"tu1","name":"Read","input":{"path":"/tmp/foo"}}]}}`
	msg, err := ParseMessageLine([]byte(line))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	cb := msg.Message.Content[0]
	if cb.Type != "tool_use" {
		t.Errorf("Type = %q, want %q", cb.Type, "tool_use")
	}
	if cb.ID != "tu1" {
		t.Errorf("ID = %q, want %q", cb.ID, "tu1")
	}
	if cb.Name != "Read" {
		t.Errorf("Name = %q, want %q", cb.Name, "Read")
	}
	if cb.Input["path"] != "/tmp/foo" {
		t.Errorf("Input[path] = %v, want %q", cb.Input["path"], "/tmp/foo")
	}
}

func TestContentBlock_Thinking(t *testing.T) {
	line := `{"type":"assistant","uuid":"a3","sessionId":"s1","timestamp":1700000006,"message":{"role":"assistant","content":[{"type":"thinking","thinking":"let me think...","signature":"sig123"}]}}`
	msg, err := ParseMessageLine([]byte(line))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	cb := msg.Message.Content[0]
	if cb.Type != "thinking" {
		t.Errorf("Type = %q, want %q", cb.Type, "thinking")
	}
	if cb.Thinking != "let me think..." {
		t.Errorf("Thinking = %q, want %q", cb.Thinking, "let me think...")
	}
	if cb.Signature != "sig123" {
		t.Errorf("Signature = %q, want %q", cb.Signature, "sig123")
	}
}

func TestContentBlock_ToolResult(t *testing.T) {
	line := `{"type":"user","uuid":"u2","sessionId":"s1","timestamp":1700000007,"message":{"role":"user","content":[{"type":"tool_result","tool_use_id":"tu1","content":"file contents here"}]},"toolUseResult":{"durationMs":150,"filenames":["foo.go"],"numFiles":1,"truncated":false}}`
	msg, err := ParseMessageLine([]byte(line))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	cb := msg.Message.Content[0]
	if cb.Type != "tool_result" {
		t.Errorf("Type = %q, want %q", cb.Type, "tool_result")
	}
	if cb.ToolUseID != "tu1" {
		t.Errorf("ToolUseID = %q, want %q", cb.ToolUseID, "tu1")
	}
	if msg.ToolUseResult == nil {
		t.Fatal("ToolUseResult is nil")
	}
	if msg.ToolUseResult.DurationMs != 150 {
		t.Errorf("DurationMs = %d, want 150", msg.ToolUseResult.DurationMs)
	}
	if len(msg.ToolUseResult.Filenames) != 1 || msg.ToolUseResult.Filenames[0] != "foo.go" {
		t.Errorf("Filenames = %v, want [foo.go]", msg.ToolUseResult.Filenames)
	}
}

func TestParseHistoryFile(t *testing.T) {
	input := strings.Join([]string{
		`{"sessionId":"s1","project":"/a","display":"task 1","timestamp":1}`,
		`not valid json`,
		`{"sessionId":"s2","project":"/b","display":"task 2","timestamp":2}`,
	}, "\n")

	entries, err := ParseHistoryFile(strings.NewReader(input))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(entries) != 2 {
		t.Fatalf("got %d entries, want 2", len(entries))
	}
	if entries[0].SessionID != "s1" {
		t.Errorf("entries[0].SessionID = %q, want %q", entries[0].SessionID, "s1")
	}
	if entries[1].SessionID != "s2" {
		t.Errorf("entries[1].SessionID = %q, want %q", entries[1].SessionID, "s2")
	}
}

func TestParseSessionFile(t *testing.T) {
	input := strings.Join([]string{
		`{"type":"user","uuid":"u1","sessionId":"s1","timestamp":1,"message":{"role":"user","content":[{"type":"text","text":"hi"}]}}`,
		`{bad json}`,
		`{"type":"assistant","uuid":"a1","sessionId":"s1","timestamp":2,"message":{"role":"assistant","content":[{"type":"text","text":"hello"}]}}`,
	}, "\n")

	messages, err := ParseSessionFile(strings.NewReader(input))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(messages) != 2 {
		t.Fatalf("got %d messages, want 2", len(messages))
	}
	if messages[0].Type != MessageTypeUser {
		t.Errorf("messages[0].Type = %q, want %q", messages[0].Type, MessageTypeUser)
	}
	if messages[1].Type != MessageTypeAssistant {
		t.Errorf("messages[1].Type = %q, want %q", messages[1].Type, MessageTypeAssistant)
	}
}

func TestEncodeProjectPath(t *testing.T) {
	got := EncodeProjectPath("/Users/foo/myproject")
	want := "-Users-foo-myproject"
	if got != want {
		t.Errorf("EncodeProjectPath = %q, want %q", got, want)
	}
}

func TestDecodeProjectPath(t *testing.T) {
	got := DecodeProjectPath("-Users-foo-myproject")
	want := "/Users/foo/myproject"
	if got != want {
		t.Errorf("DecodeProjectPath = %q, want %q", got, want)
	}
}

func TestPathEncodeDecodeRoundtrip(t *testing.T) {
	paths := []string{
		"/Users/foo/myproject",
		"/home/user/workspace/app",
		"/tmp/test",
	}
	for _, path := range paths {
		encoded := EncodeProjectPath(path)
		decoded := DecodeProjectPath(encoded)
		if decoded != path {
			t.Errorf("roundtrip failed: %q -> %q -> %q", path, encoded, decoded)
		}
	}
}
