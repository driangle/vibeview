package session

import (
	"os"
	"path/filepath"
	"testing"
)

// setupTestDir creates a temporary Claude dir with history.jsonl and session files.
func setupTestDir(t *testing.T) string {
	t.Helper()
	dir := t.TempDir()

	// Write history.jsonl with three sessions.
	historyLines := `{"sessionId":"sess-1","project":"/Users/me/project-a","display":"first session","timestamp":1000}
{"sessionId":"sess-2","project":"/Users/me/project-a","display":"second session","timestamp":2000}
{"sessionId":"sess-3","project":"/Users/me/project-b","display":"third session","timestamp":1500}
`
	if err := os.WriteFile(filepath.Join(dir, "history.jsonl"), []byte(historyLines), 0644); err != nil {
		t.Fatal(err)
	}

	// Create session files for sess-1 and sess-2.
	projADir := filepath.Join(dir, "projects", "-Users-me-project-a")
	if err := os.MkdirAll(projADir, 0755); err != nil {
		t.Fatal(err)
	}

	// sess-1: 2 messages, user then assistant with model.
	sess1 := `{"type":"user","uuid":"u1","sessionId":"sess-1","timestamp":1000,"message":{"role":"user","content":[{"type":"text","text":"Help me build a web app"}]}}
{"type":"assistant","uuid":"a1","sessionId":"sess-1","timestamp":1001,"message":{"role":"assistant","model":"claude-sonnet-4-20250514","content":[{"type":"text","text":"Sure!"}]}}
`
	if err := os.WriteFile(filepath.Join(projADir, "sess-1.jsonl"), []byte(sess1), 0644); err != nil {
		t.Fatal(err)
	}

	// sess-2: 1 message, assistant only (no user message first — edge case).
	sess2 := `{"type":"assistant","uuid":"a2","sessionId":"sess-2","timestamp":2000,"message":{"role":"assistant","model":"claude-opus-4-20250514","content":[{"type":"text","text":"Hello"}]}}
`
	if err := os.WriteFile(filepath.Join(projADir, "sess-2.jsonl"), []byte(sess2), 0644); err != nil {
		t.Fatal(err)
	}

	// sess-3: no session file (missing file test).
	return dir
}

func TestDiscover(t *testing.T) {
	dir := setupTestDir(t)

	idx, err := Discover(dir)
	if err != nil {
		t.Fatalf("Discover: %v", err)
	}

	if len(idx.Sessions) != 3 {
		t.Fatalf("expected 3 sessions, got %d", len(idx.Sessions))
	}

	// Should be sorted by timestamp descending.
	if idx.Sessions[0].SessionID != "sess-2" {
		t.Errorf("expected first session sess-2 (newest), got %s", idx.Sessions[0].SessionID)
	}
	if idx.Sessions[1].SessionID != "sess-3" {
		t.Errorf("expected second session sess-3, got %s", idx.Sessions[1].SessionID)
	}
	if idx.Sessions[2].SessionID != "sess-1" {
		t.Errorf("expected third session sess-1 (oldest), got %s", idx.Sessions[2].SessionID)
	}
}

func TestDiscoverMetadata(t *testing.T) {
	dir := setupTestDir(t)

	idx, err := Discover(dir)
	if err != nil {
		t.Fatalf("Discover: %v", err)
	}

	// Find sess-1.
	var sess1 SessionMeta
	for _, s := range idx.Sessions {
		if s.SessionID == "sess-1" {
			sess1 = s
			break
		}
	}

	if sess1.MessageCount != 2 {
		t.Errorf("sess-1 messageCount: got %d, want 2", sess1.MessageCount)
	}
	if sess1.Model != "claude-sonnet-4-20250514" {
		t.Errorf("sess-1 model: got %q, want claude-sonnet-4-20250514", sess1.Model)
	}
	if sess1.Slug != "Help me build a web app" {
		t.Errorf("sess-1 slug: got %q, want 'Help me build a web app'", sess1.Slug)
	}
}

func TestDiscoverMissingSessionFile(t *testing.T) {
	dir := setupTestDir(t)

	idx, err := Discover(dir)
	if err != nil {
		t.Fatalf("Discover: %v", err)
	}

	// sess-3 has no session file — should still appear with zero metadata.
	var sess3 SessionMeta
	for _, s := range idx.Sessions {
		if s.SessionID == "sess-3" {
			sess3 = s
			break
		}
	}

	if sess3.SessionID != "sess-3" {
		t.Fatal("sess-3 not found in index")
	}
	if sess3.MessageCount != 0 {
		t.Errorf("sess-3 messageCount: got %d, want 0", sess3.MessageCount)
	}
	if sess3.Model != "" {
		t.Errorf("sess-3 model: got %q, want empty", sess3.Model)
	}
	if sess3.Slug != "" {
		t.Errorf("sess-3 slug: got %q, want empty", sess3.Slug)
	}
}

func TestFilterByProject(t *testing.T) {
	dir := setupTestDir(t)

	idx, err := Discover(dir)
	if err != nil {
		t.Fatalf("Discover: %v", err)
	}

	filtered := idx.FilterByProject("project-a")
	if len(filtered) != 2 {
		t.Fatalf("expected 2 sessions for project-a, got %d", len(filtered))
	}
	for _, s := range filtered {
		if s.Project != "/Users/me/project-a" {
			t.Errorf("unexpected project: %s", s.Project)
		}
	}

	filtered = idx.FilterByProject("project-b")
	if len(filtered) != 1 {
		t.Fatalf("expected 1 session for project-b, got %d", len(filtered))
	}

	filtered = idx.FilterByProject("nonexistent")
	if len(filtered) != 0 {
		t.Fatalf("expected 0 sessions for nonexistent, got %d", len(filtered))
	}
}

func TestFilterByProjectPreservesOrder(t *testing.T) {
	dir := setupTestDir(t)

	idx, err := Discover(dir)
	if err != nil {
		t.Fatalf("Discover: %v", err)
	}

	filtered := idx.FilterByProject("project-a")
	if len(filtered) < 2 {
		t.Skip("not enough sessions to test order")
	}
	// sess-2 (timestamp 2000) should come before sess-1 (timestamp 1000).
	if filtered[0].SessionID != "sess-2" {
		t.Errorf("expected first filtered session sess-2, got %s", filtered[0].SessionID)
	}
}

func TestSessionFilePath(t *testing.T) {
	path := SessionFilePath("/home/.claude", "/Users/me/project", "abc-123")
	want := "/home/.claude/projects/-Users-me-project/abc-123.jsonl"
	if path != want {
		t.Errorf("SessionFilePath: got %q, want %q", path, want)
	}
}

func TestTruncateSlug(t *testing.T) {
	tests := []struct {
		input  string
		maxLen int
		want   string
	}{
		{"short", 80, "short"},
		{"hello world this is a test", 15, "hello world..."},
		{"nospaces", 4, "nosp..."},
		{"  extra   whitespace  ", 80, "extra whitespace"},
	}
	for _, tt := range tests {
		got := truncateSlug(tt.input, tt.maxLen)
		if got != tt.want {
			t.Errorf("truncateSlug(%q, %d) = %q, want %q", tt.input, tt.maxLen, got, tt.want)
		}
	}
}

func TestDiscoverMissingHistoryFile(t *testing.T) {
	dir := t.TempDir()
	_, err := Discover(dir)
	if err == nil {
		t.Error("expected error for missing history.jsonl")
	}
}
