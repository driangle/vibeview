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

	entries, result, err := ParseHistoryFile(strings.NewReader(input))
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
	if result.SkippedLines != 1 {
		t.Errorf("SkippedLines = %d, want 1", result.SkippedLines)
	}
	if len(result.MalformedSamples) != 1 || result.MalformedSamples[0] != "not valid json" {
		t.Errorf("MalformedSamples = %v, want [\"not valid json\"]", result.MalformedSamples)
	}
}

func TestParseSessionFile(t *testing.T) {
	input := strings.Join([]string{
		`{"type":"user","uuid":"u1","sessionId":"s1","timestamp":1,"message":{"role":"user","content":[{"type":"text","text":"hi"}]}}`,
		`{bad json}`,
		`{"type":"assistant","uuid":"a1","sessionId":"s1","timestamp":2,"message":{"role":"assistant","content":[{"type":"text","text":"hello"}]}}`,
	}, "\n")

	messages, result, err := ParseSessionFile(strings.NewReader(input))
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
	if result.SkippedLines != 1 {
		t.Errorf("SkippedLines = %d, want 1", result.SkippedLines)
	}
	if len(result.MalformedSamples) != 1 || result.MalformedSamples[0] != "{bad json}" {
		t.Errorf("MalformedSamples = %v, want [\"{bad json}\"]", result.MalformedSamples)
	}
}

func TestAPIMessage_ContentAsString(t *testing.T) {
	line := `{"type":"user","uuid":"u1","sessionId":"s1","timestamp":1700000000,"message":{"role":"user","content":"give me the top 3 tasks"}}`
	msg, err := ParseMessageLine([]byte(line))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if msg.Message == nil {
		t.Fatal("Message is nil")
	}
	if len(msg.Message.Content) != 1 {
		t.Fatalf("got %d content blocks, want 1", len(msg.Message.Content))
	}
	cb := msg.Message.Content[0]
	if cb.Type != "text" {
		t.Errorf("Type = %q, want %q", cb.Type, "text")
	}
	if cb.Text != "give me the top 3 tasks" {
		t.Errorf("Text = %q, want %q", cb.Text, "give me the top 3 tasks")
	}
}

func TestToolUseResult_AsString(t *testing.T) {
	line := `{"type":"user","uuid":"u1","sessionId":"s1","timestamp":1700000000,"message":{"role":"user","content":[{"type":"text","text":"hi"}]},"toolUseResult":"Error: Execute skill: taskmd:do-task"}`
	msg, err := ParseMessageLine([]byte(line))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if msg.ToolUseResult != nil {
		t.Error("expected ToolUseResult to be nil for string value")
	}
}

func TestToolUseResult_AsObject(t *testing.T) {
	line := `{"type":"user","uuid":"u1","sessionId":"s1","timestamp":1700000000,"message":{"role":"user","content":[{"type":"text","text":"hi"}]},"toolUseResult":{"durationMs":200,"filenames":["a.go"],"numFiles":1,"truncated":false}}`
	msg, err := ParseMessageLine([]byte(line))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if msg.ToolUseResult == nil {
		t.Fatal("expected ToolUseResult to be non-nil")
	}
	if msg.ToolUseResult.DurationMs != 200 {
		t.Errorf("DurationMs = %d, want 200", msg.ToolUseResult.DurationMs)
	}
}

func TestEncodeProjectPath(t *testing.T) {
	tests := []struct {
		input string
		want  string
	}{
		{"/Users/foo/myproject", "-Users-foo-myproject"},
		{"/Users/foo.bar/myproject", "-Users-foo-bar-myproject"},
		{"/Users/german.greiner/workplace", "-Users-german-greiner-workplace"},
		{"/Users/driangle/workplace/gg/germangreiner_com", "-Users-driangle-workplace-gg-germangreiner-com"},
		{"/Users/foo/my project", "-Users-foo-my-project"},
	}
	for _, tt := range tests {
		got := EncodeProjectPath(tt.input)
		if got != tt.want {
			t.Errorf("EncodeProjectPath(%q) = %q, want %q", tt.input, got, tt.want)
		}
	}
}

func TestDecodeProjectPath(t *testing.T) {
	got := DecodeProjectPath("-Users-foo-myproject")
	want := "/Users/foo/myproject"
	if got != want {
		t.Errorf("DecodeProjectPath = %q, want %q", got, want)
	}
}

func TestDecodeProjectPathIsLossy(t *testing.T) {
	// DecodeProjectPath cannot reconstruct paths with non-alphanumeric characters
	// other than "/" because EncodeProjectPath maps them all to "-".
	tests := []struct {
		original string
		name     string
	}{
		{"/Users/me/my-project", "hyphen"},
		{"/Users/german.greiner/workplace", "dot"},
		{"/Users/me/my_project", "underscore"},
		{"/Users/me/my project", "space"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			encoded := EncodeProjectPath(tt.original)
			decoded := DecodeProjectPath(encoded)
			if decoded == tt.original {
				t.Errorf("expected DecodeProjectPath to be lossy for %q, but got exact match", tt.original)
			}
			// However, encode(decode(x)) == x — the round-trip property holds.
			reEncoded := EncodeProjectPath(decoded)
			if reEncoded != encoded {
				t.Errorf("round-trip broken: EncodeProjectPath(%q) = %q, want %q", decoded, reEncoded, encoded)
			}
		})
	}
}

// --- Fuzz Tests ---

func FuzzParseMessageLine(f *testing.F) {
	// Seed with valid message types.
	f.Add([]byte(`{"type":"user","uuid":"u1","sessionId":"s1","timestamp":1700000000,"message":{"role":"user","content":[{"type":"text","text":"hello"}]}}`))
	f.Add([]byte(`{"type":"assistant","uuid":"a1","sessionId":"s1","timestamp":1700000001,"message":{"role":"assistant","model":"claude-sonnet-4-20250514","content":[{"type":"text","text":"hi"}],"usage":{"input_tokens":10,"output_tokens":5}}}`))
	f.Add([]byte(`{"type":"progress","uuid":"p1","sessionId":"s1","timestamp":1700000002,"toolUseID":"tu1","data":{"status":"running"}}`))
	f.Add([]byte(`{"type":"system","uuid":"sys1","sessionId":"s1","timestamp":1700000003}`))
	f.Add([]byte(`{"type":"result","uuid":"r1","sessionId":"s1","timestamp":1700000004,"total_cost_usd":0.05}`))
	f.Add([]byte(`{"type":"user","uuid":"u2","sessionId":"s1","timestamp":1700000005,"message":{"role":"user","content":"plain string content"}}`))
	f.Add([]byte(`{"type":"user","uuid":"u3","sessionId":"s1","timestamp":1700000006,"message":{"role":"user","content":[{"type":"text","text":"hi"}]},"toolUseResult":{"durationMs":100,"filenames":["a.go"],"numFiles":1,"truncated":false}}`))
	f.Add([]byte(`{"type":"user","uuid":"u4","sessionId":"s1","timestamp":1700000007,"message":{"role":"user","content":[{"type":"text","text":"hi"}]},"toolUseResult":"Error: something"}`))
	f.Add([]byte(`{}`))
	f.Add([]byte(`not json`))
	f.Add([]byte(``))

	f.Fuzz(func(t *testing.T, data []byte) {
		// ParseMessageLine must not panic on any input.
		_, _ = ParseMessageLine(data)
	})
}

func FuzzParseHistoryLine(f *testing.F) {
	f.Add([]byte(`{"sessionId":"abc-123","project":"/Users/foo/bar","display":"fix bug","timestamp":1700000000}`))
	f.Add([]byte(`{"sessionId":"","project":"","display":"","timestamp":0}`))
	f.Add([]byte(`{"sessionId":"s1","project":"/a","display":"d","timestamp":"2026-03-13T10:46:43.165Z"}`))
	f.Add([]byte(`{"sessionId":"s2","project":"/b","display":"d","timestamp":"1700000000"}`))
	f.Add([]byte(`{}`))
	f.Add([]byte(`not json`))
	f.Add([]byte(``))

	f.Fuzz(func(t *testing.T, data []byte) {
		// ParseHistoryLine must not panic on any input.
		_, _ = ParseHistoryLine(data)
	})
}
