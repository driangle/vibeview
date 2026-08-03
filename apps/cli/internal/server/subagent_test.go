package server

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

// subagentsDirFor returns the on-disk subagents directory for sess-1, which the
// shared test fixture places in project-a.
func subagentsDirFor(claudeDir string) string {
	return filepath.Join(claudeDir, "projects", "-users-me-project-a", "sess-1", "subagents")
}

// writeSubagent creates agent-<id>.jsonl (and optionally its meta file) for sess-1.
func writeSubagent(t *testing.T, claudeDir, agentID, meta string) {
	t.Helper()
	dir := subagentsDirFor(claudeDir)
	if err := os.MkdirAll(dir, 0755); err != nil {
		t.Fatal(err)
	}
	transcript := `{"type":"user","uuid":"su1","sessionId":"sess-1","timestamp":1700000000000,"message":{"role":"user","content":[{"type":"text","text":"subagent hello"}]}}` + "\n"
	if err := os.WriteFile(filepath.Join(dir, "agent-"+agentID+".jsonl"), []byte(transcript), 0644); err != nil {
		t.Fatal(err)
	}
	if meta != "" {
		if err := os.WriteFile(filepath.Join(dir, "agent-"+agentID+".meta.json"), []byte(meta), 0644); err != nil {
			t.Fatal(err)
		}
	}
}

func newServerWithClaudeDir(t *testing.T, claudeDir string) *Server {
	t.Helper()
	srv, err := New(Config{ClaudeDir: claudeDir})
	if err != nil {
		t.Fatalf("New() error: %v", err)
	}
	return srv
}

func TestGetSubagentReturnsConversation(t *testing.T) {
	dir := setupTestDir(t)
	writeSubagent(t, dir, "abc123", `{"agentType":"Explore","description":"look around"}`)
	srv := newServerWithClaudeDir(t, dir)

	req := httptest.NewRequest("GET", "/api/sessions/sess-1/subagents/abc123", nil)
	w := httptest.NewRecorder()
	srv.mux.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d; body: %s", w.Code, w.Body.String())
	}

	var resp SubagentDetailResponse
	if err := json.NewDecoder(w.Body).Decode(&resp); err != nil {
		t.Fatal(err)
	}
	if resp.AgentID != "abc123" {
		t.Errorf("AgentID = %q, want abc123", resp.AgentID)
	}
	if resp.AgentType != "Explore" {
		t.Errorf("AgentType = %q, want Explore", resp.AgentType)
	}
	if len(resp.Messages) != 1 {
		t.Fatalf("expected 1 message, got %d", len(resp.Messages))
	}
}

func TestGetSubagentResolvesToolUseID(t *testing.T) {
	dir := setupTestDir(t)
	writeSubagent(t, dir, "real-agent", `{"agentType":"Explore","description":"Investigate tests"}`)

	parentPath := filepath.Join(dir, "projects", "-users-me-project-a", "sess-1.jsonl")
	toolUse := `{"type":"assistant","uuid":"tool-parent","sessionId":"sess-1","timestamp":1700000002000,"message":{"role":"assistant","content":[{"type":"tool_use","id":"call-123","name":"Agent","input":{"description":"Investigate tests"}}]}}` + "\n"
	f, err := os.OpenFile(parentPath, os.O_APPEND|os.O_WRONLY, 0644)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := f.WriteString(toolUse); err != nil {
		f.Close()
		t.Fatal(err)
	}
	if err := f.Close(); err != nil {
		t.Fatal(err)
	}

	srv := newServerWithClaudeDir(t, dir)
	req := httptest.NewRequest("GET", "/api/sessions/sess-1/subagents/tool_use_call-123", nil)
	w := httptest.NewRecorder()
	srv.mux.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
	var resp SubagentDetailResponse
	if err := json.NewDecoder(w.Body).Decode(&resp); err != nil {
		t.Fatal(err)
	}
	if resp.AgentID != "real-agent" {
		t.Errorf("AgentID = %q, want real-agent", resp.AgentID)
	}
}

func TestGetSubagentSessionNotFound(t *testing.T) {
	srv := newTestServer(t)
	req := httptest.NewRequest("GET", "/api/sessions/nonexistent/subagents/abc123", nil)
	w := httptest.NewRecorder()
	srv.mux.ServeHTTP(w, req)

	if w.Code != http.StatusNotFound {
		t.Fatalf("expected 404, got %d", w.Code)
	}
}

func TestGetSubagentUnknownAgentNotFound(t *testing.T) {
	srv := newTestServer(t)
	req := httptest.NewRequest("GET", "/api/sessions/sess-1/subagents/does-not-exist", nil)
	w := httptest.NewRecorder()
	srv.mux.ServeHTTP(w, req)

	if w.Code != http.StatusNotFound {
		t.Fatalf("expected 404, got %d", w.Code)
	}
}

// TestGetSubagentRejectsTraversal ensures a percent-encoded traversal payload
// that survives router path-cleaning is rejected before touching the filesystem.
func TestGetSubagentRejectsTraversal(t *testing.T) {
	dir := setupTestDir(t)

	// Plant a secret one level above the subagents directory. A successful
	// traversal to "../secret" (as agent-<id>.jsonl) must never expose it.
	sessionDir := filepath.Join(dir, "projects", "-users-me-project-a", "sess-1")
	if err := os.MkdirAll(sessionDir, 0755); err != nil {
		t.Fatal(err)
	}
	secret := `{"type":"user","uuid":"x","sessionId":"sess-1","timestamp":1,"message":{"role":"user","content":[{"type":"text","text":"TOP_SECRET"}]}}` + "\n"
	if err := os.WriteFile(filepath.Join(sessionDir, "agent-..secret.jsonl"), []byte(secret), 0644); err != nil {
		t.Fatal(err)
	}
	srv := newServerWithClaudeDir(t, dir)

	// %2F decodes to '/' inside the single {agentId} path segment, so this reaches
	// the handler as the literal traversal string rather than extra route segments.
	payloads := []string{
		"..%2F..%2Fsecret",
		"..%2Fsecret",
		"foo%2Fbar",
	}
	for _, p := range payloads {
		t.Run(p, func(t *testing.T) {
			req := httptest.NewRequest("GET", "/api/sessions/sess-1/subagents/"+p, nil)
			w := httptest.NewRecorder()
			srv.mux.ServeHTTP(w, req)

			if w.Code != http.StatusBadRequest && w.Code != http.StatusNotFound {
				t.Fatalf("payload %q: expected 400/404, got %d", p, w.Code)
			}
			if strings.Contains(w.Body.String(), "TOP_SECRET") {
				t.Fatalf("payload %q: response leaked file outside subagents dir", p)
			}
		})
	}
}

// TestGetSubagentRejectsSymlinkEscape ensures a symlinked agent file pointing
// outside the subagents directory is not followed.
func TestGetSubagentRejectsSymlinkEscape(t *testing.T) {
	dir := setupTestDir(t)

	subagentsDir := subagentsDirFor(dir)
	if err := os.MkdirAll(subagentsDir, 0755); err != nil {
		t.Fatal(err)
	}

	// Secret lives entirely outside the claude dir.
	outside := t.TempDir()
	secretPath := filepath.Join(outside, "secret.jsonl")
	secret := `{"type":"user","uuid":"x","sessionId":"sess-1","timestamp":1,"message":{"role":"user","content":[{"type":"text","text":"TOP_SECRET"}]}}` + "\n"
	if err := os.WriteFile(secretPath, []byte(secret), 0644); err != nil {
		t.Fatal(err)
	}

	// agent-evil.jsonl -> outside/secret.jsonl
	if err := os.Symlink(secretPath, filepath.Join(subagentsDir, "agent-evil.jsonl")); err != nil {
		t.Fatal(err)
	}
	srv := newServerWithClaudeDir(t, dir)

	req := httptest.NewRequest("GET", "/api/sessions/sess-1/subagents/evil", nil)
	w := httptest.NewRecorder()
	srv.mux.ServeHTTP(w, req)

	if w.Code != http.StatusNotFound {
		t.Fatalf("expected 404 for symlink escape, got %d", w.Code)
	}
	if strings.Contains(w.Body.String(), "TOP_SECRET") {
		t.Fatal("response leaked symlinked file outside subagents dir")
	}
}
