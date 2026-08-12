package sessionhtml

import (
	"encoding/json"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"testing"

	"github.com/driangle/vibeview/apps/lib/session"
)

const conversation = `{"type":"user","uuid":"u1","sessionId":"sess-1","timestamp":1700000000000,"message":{"role":"user","content":[{"type":"text","text":"hello world"}]}}
{"type":"assistant","uuid":"a1","sessionId":"sess-1","timestamp":1700000001000,"message":{"role":"assistant","model":"claude-sonnet-4-20250514","content":[{"type":"text","text":"Hi there!"}],"usage":{"input_tokens":10,"output_tokens":5,"costUSD":0.003}}}
`

// writeSession creates a session file in a temporary claude directory and
// returns the directory plus the target describing the session.
func writeSession(t *testing.T, lines string) (string, session.Target) {
	t.Helper()
	claudeDir := t.TempDir()
	projectDir := filepath.Join(claudeDir, "projects", "-users-me-project")
	if err := os.MkdirAll(projectDir, 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(projectDir, "sess-1.jsonl"), []byte(lines), 0o644); err != nil {
		t.Fatal(err)
	}
	return claudeDir, session.Target{
		Meta: session.SessionMeta{
			SessionID: "sess-1",
			Project:   "/users/me/project",
			Timestamp: 1700000000000,
		},
		BaseDir: claudeDir,
	}
}

// dataNode returns the JSON embedded in a rendered page.
func dataNode(t *testing.T, page []byte) map[string]any {
	t.Helper()
	pattern := regexp.MustCompile(`(?s)<script id="vibeview-export-data" type="application/json">(.*?)</script>`)
	match := pattern.FindSubmatch(page)
	if match == nil {
		t.Fatal("rendered page has no session data node")
	}
	var payload map[string]any
	if err := json.Unmarshal(match[1], &payload); err != nil {
		t.Fatalf("embedded payload is not valid JSON: %v", err)
	}
	return payload
}

func TestBuildPayloadIncludesConversationAndUsage(t *testing.T) {
	_, target := writeSession(t, conversation)

	payload, err := BuildPayload(target, true)
	if err != nil {
		t.Fatalf("BuildPayload() error: %v", err)
	}

	if payload.SessionID != "sess-1" {
		t.Errorf("session id = %q, want sess-1", payload.SessionID)
	}
	if len(payload.Session.Messages) != 2 {
		t.Errorf("messages = %d, want 2", len(payload.Session.Messages))
	}
	if payload.Session.Timeline == nil {
		t.Error("timeline missing: the exported page renders a Timeline tab from it")
	}
	if payload.Settings.MessagesPerPage == 0 {
		t.Error("settings missing: the page paginates using them")
	}
	if !payload.Config.CostEnabled {
		t.Error("cost setting did not reach the payload")
	}
}

func TestBuildPayloadReportsUnknownSession(t *testing.T) {
	claudeDir, _ := writeSession(t, conversation)

	_, err := BuildPayload(session.Target{
		Meta:    session.SessionMeta{SessionID: "missing", Project: "/users/me/project"},
		BaseDir: claudeDir,
	}, false)
	if err == nil {
		t.Fatal("BuildPayload() succeeded for a session with no file")
	}
}

// Render is the SDK entry point: a session reference in, a page out.
func TestRenderResolvesSessionByPrefix(t *testing.T) {
	claudeDir, _ := writeSession(t, conversation)

	page, err := Render(Request{Session: "sess", ClaudeDir: claudeDir})
	if err != nil {
		t.Fatalf("Render() error: %v", err)
	}

	if !strings.HasPrefix(string(page), "<!doctype html>") {
		t.Error("rendered page is not an HTML document")
	}
	if embedded := dataNode(t, page); embedded["sessionId"] != "sess-1" {
		t.Errorf("embedded session id = %v, want sess-1", embedded["sessionId"])
	}
}

func TestRenderAcceptsTranscriptPath(t *testing.T) {
	path := filepath.Join(t.TempDir(), "sess-1.jsonl")
	if err := os.WriteFile(path, []byte(conversation), 0o644); err != nil {
		t.Fatal(err)
	}

	// No claude directory involved: a standalone transcript renders on its own.
	page, err := Render(Request{Session: path})
	if err != nil {
		t.Fatalf("Render() error: %v", err)
	}
	if embedded := dataNode(t, page); embedded["sessionId"] != "sess-1" {
		t.Errorf("embedded session id = %v, want sess-1", embedded["sessionId"])
	}
}

func TestRenderReportsUnknownSession(t *testing.T) {
	claudeDir, _ := writeSession(t, conversation)

	if _, err := Render(Request{Session: "nope-not-here", ClaudeDir: claudeDir}); err == nil {
		t.Fatal("Render() succeeded for an unknown session")
	}
}

// Session content is arbitrary text, including text about HTML. It must not be
// able to close the script tag it is embedded in.
func TestRenderNeutralizesClosingScriptTag(t *testing.T) {
	hostile := `{"type":"user","uuid":"u1","sessionId":"sess-1","timestamp":1700000000000,"message":{"role":"user","content":[{"type":"text","text":"</script><img src=x onerror=alert(1)>"}]}}
`
	_, target := writeSession(t, hostile)
	payload, err := BuildPayload(target, false)
	if err != nil {
		t.Fatalf("BuildPayload() error: %v", err)
	}

	page, err := RenderPayload(payload)
	if err != nil {
		t.Fatalf("RenderPayload() error: %v", err)
	}

	if strings.Contains(string(page), "</script><img") {
		t.Error("session content closed the data node")
	}
	embedded := dataNode(t, page)
	messages, _ := embedded["session"].(map[string]any)["messages"].([]any)
	if len(messages) != 1 {
		t.Fatalf("messages = %d, want 1 (payload did not survive escaping)", len(messages))
	}
}
