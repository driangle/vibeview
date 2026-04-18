package session

import (
	"fmt"
	"math"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/driangle/vibeview/internal/claude"
)

func TestMain(m *testing.M) {
	os.Exit(m.Run())
}

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

	// sess-1: 2 messages, user then assistant with model and usage.
	sess1 := `{"type":"user","uuid":"u1","sessionId":"sess-1","timestamp":1000,"message":{"role":"user","content":[{"type":"text","text":"Help me build a web app"}]}}
{"type":"assistant","uuid":"a1","sessionId":"sess-1","timestamp":1001,"message":{"role":"assistant","model":"claude-sonnet-4-20250514","content":[{"type":"text","text":"Sure!"}],"usage":{"input_tokens":100,"output_tokens":50,"cache_creation_input_tokens":10,"cache_read_input_tokens":20,"costUSD":0.005}}}
`
	if err := os.WriteFile(filepath.Join(projADir, "sess-1.jsonl"), []byte(sess1), 0644); err != nil {
		t.Fatal(err)
	}

	// sess-2: 1 message, assistant only (no user message first — edge case).
	sess2 := `{"type":"assistant","uuid":"a2","sessionId":"sess-2","timestamp":2000,"message":{"role":"assistant","model":"claude-opus-4-20250514","content":[{"type":"text","text":"Hello"}],"usage":{"input_tokens":200,"output_tokens":100,"costUSD":0.012}}}
`
	if err := os.WriteFile(filepath.Join(projADir, "sess-2.jsonl"), []byte(sess2), 0644); err != nil {
		t.Fatal(err)
	}

	// sess-3: no session file (missing file test).
	return dir
}

func TestDiscover(t *testing.T) {
	dir := setupTestDir(t)

	idx, err := Discover(dir, nil)
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

	idx, err := Discover(dir, nil)
	if err != nil {
		t.Fatalf("Discover: %v", err)
	}
	idx.Enrich(dir)

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

func TestDiscoverUsageTotals(t *testing.T) {
	dir := setupTestDir(t)

	idx, err := Discover(dir, nil)
	if err != nil {
		t.Fatalf("Discover: %v", err)
	}
	idx.Enrich(dir)

	// Find sess-1: one assistant message with usage.
	var sess1 SessionMeta
	for _, s := range idx.Sessions {
		if s.SessionID == "sess-1" {
			sess1 = s
			break
		}
	}

	if sess1.Usage.InputTokens != 100 {
		t.Errorf("sess-1 usage.InputTokens = %d, want 100", sess1.Usage.InputTokens)
	}
	if sess1.Usage.OutputTokens != 50 {
		t.Errorf("sess-1 usage.OutputTokens = %d, want 50", sess1.Usage.OutputTokens)
	}
	if sess1.Usage.CacheCreationInputTokens != 10 {
		t.Errorf("sess-1 usage.CacheCreationInputTokens = %d, want 10", sess1.Usage.CacheCreationInputTokens)
	}
	if sess1.Usage.CacheReadInputTokens != 20 {
		t.Errorf("sess-1 usage.CacheReadInputTokens = %d, want 20", sess1.Usage.CacheReadInputTokens)
	}
	// Cost is not calculated — only populated from explicit TotalCostUSD in result messages.
	if sess1.Usage.CostUSD != 0 {
		t.Errorf("sess-1 usage.CostUSD = %f, want 0 (no result message)", sess1.Usage.CostUSD)
	}

	// Find sess-2: one assistant message with usage.
	var sess2 SessionMeta
	for _, s := range idx.Sessions {
		if s.SessionID == "sess-2" {
			sess2 = s
			break
		}
	}

	if sess2.Usage.InputTokens != 200 {
		t.Errorf("sess-2 usage.InputTokens = %d, want 200", sess2.Usage.InputTokens)
	}
	if sess2.Usage.CostUSD != 0 {
		t.Errorf("sess-2 usage.CostUSD = %f, want 0 (no result message)", sess2.Usage.CostUSD)
	}

	// sess-3 has no session file — usage should be zero.
	var sess3 SessionMeta
	for _, s := range idx.Sessions {
		if s.SessionID == "sess-3" {
			sess3 = s
			break
		}
	}

	if sess3.Usage.CostUSD != 0 {
		t.Errorf("sess-3 usage.CostUSD = %f, want 0", sess3.Usage.CostUSD)
	}
}

func TestUsageTotalsMultipleAssistantMessages(t *testing.T) {
	dir := t.TempDir()

	history := `{"sessionId":"sess-multi","project":"/Users/me/proj","display":"multi","timestamp":3000}
`
	if err := os.WriteFile(filepath.Join(dir, "history.jsonl"), []byte(history), 0644); err != nil {
		t.Fatal(err)
	}

	projDir := filepath.Join(dir, "projects", "-Users-me-proj")
	if err := os.MkdirAll(projDir, 0755); err != nil {
		t.Fatal(err)
	}

	// Session with multiple assistant messages to test aggregation.
	sess := `{"type":"user","uuid":"u1","sessionId":"sess-multi","timestamp":3000,"message":{"role":"user","content":[{"type":"text","text":"hi"}]}}
{"type":"assistant","uuid":"a1","sessionId":"sess-multi","timestamp":3001,"message":{"role":"assistant","model":"claude-sonnet-4-20250514","content":[{"type":"text","text":"hello"}],"usage":{"input_tokens":100,"output_tokens":50,"cache_creation_input_tokens":5,"cache_read_input_tokens":10,"costUSD":0.003}}}
{"type":"user","uuid":"u2","sessionId":"sess-multi","timestamp":3002,"message":{"role":"user","content":[{"type":"text","text":"more"}]}}
{"type":"assistant","uuid":"a2","sessionId":"sess-multi","timestamp":3003,"message":{"role":"assistant","model":"claude-sonnet-4-20250514","content":[{"type":"text","text":"sure"}],"usage":{"input_tokens":200,"output_tokens":100,"cache_creation_input_tokens":15,"cache_read_input_tokens":30,"costUSD":0.007}}}
`
	if err := os.WriteFile(filepath.Join(projDir, "sess-multi.jsonl"), []byte(sess), 0644); err != nil {
		t.Fatal(err)
	}

	idx, err := Discover(dir, nil)
	if err != nil {
		t.Fatalf("Discover: %v", err)
	}
	idx.Enrich(dir)

	if len(idx.Sessions) != 1 {
		t.Fatalf("expected 1 session, got %d", len(idx.Sessions))
	}

	u := idx.Sessions[0].Usage
	if u.InputTokens != 300 {
		t.Errorf("InputTokens = %d, want 300", u.InputTokens)
	}
	if u.OutputTokens != 150 {
		t.Errorf("OutputTokens = %d, want 150", u.OutputTokens)
	}
	if u.CacheCreationInputTokens != 20 {
		t.Errorf("CacheCreationInputTokens = %d, want 20", u.CacheCreationInputTokens)
	}
	if u.CacheReadInputTokens != 40 {
		t.Errorf("CacheReadInputTokens = %d, want 40", u.CacheReadInputTokens)
	}
	// Cost is not calculated — no result message present.
	if u.CostUSD != 0 {
		t.Errorf("CostUSD = %f, want 0 (no result message)", u.CostUSD)
	}
}

func TestResultMessageCostTakesPrecedence(t *testing.T) {
	dir := t.TempDir()

	history := `{"sessionId":"sess-result","project":"/Users/me/proj","display":"result test","timestamp":5000}
`
	if err := os.WriteFile(filepath.Join(dir, "history.jsonl"), []byte(history), 0644); err != nil {
		t.Fatal(err)
	}

	projDir := filepath.Join(dir, "projects", "-Users-me-proj")
	if err := os.MkdirAll(projDir, 0755); err != nil {
		t.Fatal(err)
	}

	// Programmatic sessions (claude -p) emit a result message with the CLI's
	// authoritative TotalCostUSD. This should be used as the session cost.
	sess := `{"type":"user","uuid":"u1","sessionId":"sess-result","timestamp":5000,"message":{"role":"user","content":[{"type":"text","text":"hi"}]}}
{"type":"assistant","uuid":"a1","sessionId":"sess-result","timestamp":5001,"message":{"role":"assistant","model":"claude-sonnet-4-20250514","content":[{"type":"text","text":"hello"}],"usage":{"input_tokens":100,"output_tokens":50,"cache_creation_input_tokens":5,"cache_read_input_tokens":10}}}
{"type":"result","uuid":"r1","sessionId":"sess-result","timestamp":5002,"total_cost_usd":0.0042}
`
	if err := os.WriteFile(filepath.Join(projDir, "sess-result.jsonl"), []byte(sess), 0644); err != nil {
		t.Fatal(err)
	}

	idx, err := Discover(dir, nil)
	if err != nil {
		t.Fatalf("Discover: %v", err)
	}
	idx.Enrich(dir)

	u := idx.Sessions[0].Usage
	if math.Abs(u.CostUSD-0.0042) > 1e-9 {
		t.Errorf("CostUSD = %f, want 0.0042 (from result message)", u.CostUSD)
	}
}

func TestDiscoverMissingSessionFile(t *testing.T) {
	dir := setupTestDir(t)

	idx, err := Discover(dir, nil)
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

	idx, err := Discover(dir, nil)
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

	idx, err := Discover(dir, nil)
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
	path, err := SessionFilePath("/home/.claude", "/Users/me/project", "abc-123")
	if err != nil {
		t.Fatalf("SessionFilePath: unexpected error: %v", err)
	}
	want := "/home/.claude/projects/-Users-me-project/abc-123.jsonl"
	if path != want {
		t.Errorf("SessionFilePath: got %q, want %q", path, want)
	}
}

func TestSessionFilePathRejectsTraversal(t *testing.T) {
	bad := []string{
		"../../../etc/passwd",
		"foo/bar",
		"hello world",
		"",
		"session.jsonl",
	}
	for _, id := range bad {
		_, err := SessionFilePath("/home/.claude", "/Users/me/project", id)
		if err == nil {
			t.Errorf("SessionFilePath(%q) should have returned error", id)
		}
	}
}

func TestSlugExtractedWhenNonUserMessagesFirst(t *testing.T) {
	dir := t.TempDir()

	history := `{"sessionId":"sess-q","project":"/Users/me/proj","display":"queue test","timestamp":3000}
`
	if err := os.WriteFile(filepath.Join(dir, "history.jsonl"), []byte(history), 0644); err != nil {
		t.Fatal(err)
	}

	projDir := filepath.Join(dir, "projects", "-Users-me-proj")
	if err := os.MkdirAll(projDir, 0755); err != nil {
		t.Fatal(err)
	}

	// Session starts with queue-operation messages before the first user message.
	sessData := `{"type":"queue-operation","operation":"enqueue","timestamp":"2026-03-13T10:46:43.165Z","sessionId":"sess-q"}
{"type":"queue-operation","operation":"dequeue","timestamp":"2026-03-13T10:46:43.166Z","sessionId":"sess-q"}
{"type":"user","uuid":"u1","sessionId":"sess-q","timestamp":3000,"message":{"role":"user","content":[{"type":"text","text":"Fix the login bug"}]}}
{"type":"assistant","uuid":"a1","sessionId":"sess-q","timestamp":3001,"message":{"role":"assistant","model":"claude-sonnet-4-20250514","content":[{"type":"text","text":"On it."}],"usage":{"input_tokens":10,"output_tokens":5}}}
`
	if err := os.WriteFile(filepath.Join(projDir, "sess-q.jsonl"), []byte(sessData), 0644); err != nil {
		t.Fatal(err)
	}

	idx, err := Discover(dir, nil)
	if err != nil {
		t.Fatalf("Discover: %v", err)
	}
	idx.Enrich(dir)

	if len(idx.Sessions) != 1 {
		t.Fatalf("expected 1 session, got %d", len(idx.Sessions))
	}
	if idx.Sessions[0].Slug != "Fix the login bug" {
		t.Errorf("slug: got %q, want %q", idx.Sessions[0].Slug, "Fix the login bug")
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
		{"<command-message>release</command-message>", 80, "release"},
		{"<local-command-caveat>Caveat: messages below</local-command-caveat>text after", 80, "Caveat: messages belowtext after"},
		{"<system-reminder>hidden</system-reminder>visible text", 80, "hiddenvisible text"},
		// Skill calls: command-name is stripped entirely (redundant with command-message).
		{"<command-message>taskmd:do-task</command-message>\n<command-name>/taskmd:do-task</command-name>\n<command-args>01kkx4368</command-args>", 80, "taskmd:do-task 01kkx4368"},
	}
	for _, tt := range tests {
		got := truncateSlug(tt.input, tt.maxLen)
		if got != tt.want {
			t.Errorf("truncateSlug(%q, %d) = %q, want %q", tt.input, tt.maxLen, got, tt.want)
		}
	}
}

func TestSlugSkipsMetaMessages(t *testing.T) {
	dir := t.TempDir()

	history := `{"sessionId":"sess-meta","project":"/Users/me/proj","display":"meta test","timestamp":4000}
`
	if err := os.WriteFile(filepath.Join(dir, "history.jsonl"), []byte(history), 0644); err != nil {
		t.Fatal(err)
	}

	projDir := filepath.Join(dir, "projects", "-Users-me-proj")
	if err := os.MkdirAll(projDir, 0755); err != nil {
		t.Fatal(err)
	}

	// Session starts with a meta user message (isMeta: true), followed by the real user message.
	sessData := `{"type":"user","uuid":"u0","sessionId":"sess-meta","timestamp":4000,"isMeta":true,"message":{"role":"user","content":"<local-command-caveat>Caveat: The messages below were generated by the user while running local commands.</local-command-caveat>"}}
{"type":"user","uuid":"u1","sessionId":"sess-meta","timestamp":4001,"message":{"role":"user","content":[{"type":"text","text":"Help me refactor the auth module"}]}}
{"type":"assistant","uuid":"a1","sessionId":"sess-meta","timestamp":4002,"message":{"role":"assistant","model":"claude-sonnet-4-20250514","content":[{"type":"text","text":"Sure!"}],"usage":{"input_tokens":10,"output_tokens":5}}}
`
	if err := os.WriteFile(filepath.Join(projDir, "sess-meta.jsonl"), []byte(sessData), 0644); err != nil {
		t.Fatal(err)
	}

	idx, err := Discover(dir, nil)
	if err != nil {
		t.Fatalf("Discover: %v", err)
	}
	idx.Enrich(dir)

	if len(idx.Sessions) != 1 {
		t.Fatalf("expected 1 session, got %d", len(idx.Sessions))
	}
	if idx.Sessions[0].Slug != "Help me refactor the auth module" {
		t.Errorf("slug: got %q, want %q", idx.Sessions[0].Slug, "Help me refactor the auth module")
	}
}

func TestDiscoverMissingHistoryFile(t *testing.T) {
	dir := t.TempDir()
	idx, err := Discover(dir, nil)
	if err != nil {
		t.Fatalf("Discover should tolerate missing history.jsonl: %v", err)
	}
	if len(idx.GetSessions()) != 0 {
		t.Error("expected 0 sessions when both history and projects are missing")
	}
}

func TestLoadFromPathsSkipsSymlinks(t *testing.T) {
	dir := t.TempDir()

	// Create a real JSONL file.
	realFile := filepath.Join(dir, "real.jsonl")
	content := `{"type":"human","message":{"role":"user","content":[{"type":"text","text":"hello"}]},"timestamp":1000}` + "\n"
	if err := os.WriteFile(realFile, []byte(content), 0644); err != nil {
		t.Fatal(err)
	}

	// Create a symlink to an outside file.
	outside := t.TempDir()
	secret := filepath.Join(outside, "secret.jsonl")
	if err := os.WriteFile(secret, []byte(content), 0644); err != nil {
		t.Fatal(err)
	}
	link := filepath.Join(dir, "evil.jsonl")
	if err := os.Symlink(secret, link); err != nil {
		t.Skip("cannot create symlinks")
	}

	idx, err := LoadFromPaths([]string{dir})
	if err != nil {
		t.Fatal(err)
	}

	// Only the real file should be loaded, not the symlink.
	for _, s := range idx.Sessions {
		if s.FilePath == secret {
			t.Error("symlinked file should not be loaded")
		}
	}
}

func TestLoadFromPathsDepthLimit(t *testing.T) {
	dir := t.TempDir()

	// Create a deeply nested JSONL file beyond maxWalkDepth.
	deep := dir
	for i := 0; i < maxWalkDepth+5; i++ {
		deep = filepath.Join(deep, "sub")
	}
	if err := os.MkdirAll(deep, 0755); err != nil {
		t.Fatal(err)
	}
	content := `{"type":"human","message":{"role":"user","content":[{"type":"text","text":"deep"}]},"timestamp":1000}` + "\n"
	deepFile := filepath.Join(deep, "deep.jsonl")
	if err := os.WriteFile(deepFile, []byte(content), 0644); err != nil {
		t.Fatal(err)
	}

	idx, err := LoadFromPaths([]string{dir})
	if err != nil {
		t.Fatal(err)
	}

	for _, s := range idx.Sessions {
		if s.FilePath == deepFile {
			t.Error("file beyond depth limit should not be loaded")
		}
	}
}

// --- AddSession tests ---

func TestAddSession(t *testing.T) {
	dir := setupTestDir(t)
	idx, err := Discover(dir, nil)
	if err != nil {
		t.Fatal(err)
	}

	initialCount := len(idx.GetSessions())

	entry := claude.HistoryEntry{
		SessionID: "new-sess",
		Project:   "/Users/me/project-c",
		Timestamp: 9000,
	}
	idx.AddSession(dir, entry)

	sessions := idx.GetSessions()
	if len(sessions) != initialCount+1 {
		t.Fatalf("expected %d sessions after add, got %d", initialCount+1, len(sessions))
	}
	// New session should be prepended (first).
	if sessions[0].SessionID != "new-sess" {
		t.Errorf("expected new session first, got %s", sessions[0].SessionID)
	}
}

func TestAddSessionDuplicate(t *testing.T) {
	dir := setupTestDir(t)
	idx, err := Discover(dir, nil)
	if err != nil {
		t.Fatal(err)
	}

	initialCount := len(idx.GetSessions())

	// Try to add a session that already exists.
	entry := claude.HistoryEntry{
		SessionID: "sess-1",
		Project:   "/Users/me/project-a",
		Timestamp: 9999,
	}
	idx.AddSession(dir, entry)

	if len(idx.GetSessions()) != initialCount {
		t.Error("adding duplicate session should not increase count")
	}
}

// --- SetCustomTitle tests ---

func TestSetCustomTitle(t *testing.T) {
	dir := setupTestDir(t)
	idx, err := Discover(dir, nil)
	if err != nil {
		t.Fatal(err)
	}

	idx.SetCustomTitle("sess-1", "My Custom Title")

	meta := idx.FindSession("sess-1")
	if meta == nil {
		t.Fatal("sess-1 not found")
	}
	if meta.CustomTitle != "My Custom Title" {
		t.Errorf("CustomTitle = %q, want %q", meta.CustomTitle, "My Custom Title")
	}
}

func TestSetCustomTitleNonexistent(t *testing.T) {
	dir := setupTestDir(t)
	idx, err := Discover(dir, nil)
	if err != nil {
		t.Fatal(err)
	}

	// Should not panic for non-existent session.
	idx.SetCustomTitle("nonexistent", "Title")
}

// --- SetActivityState tests ---

func TestSetActivityState(t *testing.T) {
	dir := setupTestDir(t)
	idx, err := Discover(dir, nil)
	if err != nil {
		t.Fatal(err)
	}

	idx.SetActivityState("sess-1", ActivityWorking)

	meta := idx.FindSession("sess-1")
	if meta == nil {
		t.Fatal("sess-1 not found")
	}
	if meta.ActivityState != ActivityWorking {
		t.Errorf("ActivityState = %q, want %q", meta.ActivityState, ActivityWorking)
	}
}

func TestSetActivityStateNonexistent(t *testing.T) {
	dir := setupTestDir(t)
	idx, err := Discover(dir, nil)
	if err != nil {
		t.Fatal(err)
	}

	// Should not panic for non-existent session.
	idx.SetActivityState("nonexistent", ActivityIdle)
}

// --- FindSession tests ---

func TestFindSession(t *testing.T) {
	dir := setupTestDir(t)
	idx, err := Discover(dir, nil)
	if err != nil {
		t.Fatal(err)
	}

	meta := idx.FindSession("sess-1")
	if meta == nil {
		t.Fatal("expected to find sess-1")
	}
	if meta.SessionID != "sess-1" {
		t.Errorf("SessionID = %q, want sess-1", meta.SessionID)
	}

	if idx.FindSession("nonexistent") != nil {
		t.Error("expected nil for nonexistent session")
	}
}

// --- FindSessionByPrefix tests ---

func TestFindSessionByPrefix(t *testing.T) {
	idx := &Index{
		Sessions: []SessionMeta{
			{SessionID: "abc-111"},
			{SessionID: "abc-222"},
			{SessionID: "def-333"},
		},
	}

	// Unique prefix.
	meta, err := idx.FindSessionByPrefix("def")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if meta.SessionID != "def-333" {
		t.Errorf("SessionID = %q, want def-333", meta.SessionID)
	}

	// Ambiguous prefix.
	_, err = idx.FindSessionByPrefix("abc")
	if err == nil {
		t.Fatal("expected error for ambiguous prefix")
	}
	if !strings.Contains(err.Error(), "ambiguous") {
		t.Errorf("error = %q, want 'ambiguous'", err.Error())
	}

	// No match.
	_, err = idx.FindSessionByPrefix("zzz")
	if err == nil {
		t.Fatal("expected error for no match")
	}
	if !strings.Contains(err.Error(), "no session") {
		t.Errorf("error = %q, want 'no session'", err.Error())
	}

	// Exact match (full ID as prefix).
	meta, err = idx.FindSessionByPrefix("abc-111")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if meta.SessionID != "abc-111" {
		t.Errorf("SessionID = %q, want abc-111", meta.SessionID)
	}
}

// --- EnrichSession tests ---

func TestEnrichSession(t *testing.T) {
	dir := setupTestDir(t)
	idx, err := Discover(dir, nil)
	if err != nil {
		t.Fatal(err)
	}

	// sess-1 has a session file, should enrich successfully.
	if !idx.EnrichSession(dir, "sess-1") {
		t.Error("expected EnrichSession to return true for sess-1")
	}

	meta := idx.FindSession("sess-1")
	if meta.MessageCount != 2 {
		t.Errorf("after enrichment, MessageCount = %d, want 2", meta.MessageCount)
	}
	if meta.Model == "" {
		t.Error("expected non-empty model after enrichment")
	}
}

func TestEnrichSessionMissingFile(t *testing.T) {
	dir := setupTestDir(t)
	idx, err := Discover(dir, nil)
	if err != nil {
		t.Fatal(err)
	}

	// sess-3 has no session file.
	if idx.EnrichSession(dir, "sess-3") {
		t.Error("expected EnrichSession to return false for sess-3 (no file)")
	}
}

func TestEnrichSessionNonexistent(t *testing.T) {
	dir := setupTestDir(t)
	idx, err := Discover(dir, nil)
	if err != nil {
		t.Fatal(err)
	}

	if idx.EnrichSession(dir, "nonexistent") {
		t.Error("expected EnrichSession to return false for nonexistent session")
	}
}

// --- EnrichN tests ---

func TestEnrichN(t *testing.T) {
	dir := setupTestDir(t)
	idx, err := Discover(dir, nil)
	if err != nil {
		t.Fatal(err)
	}

	// Enrich only the first session (most recent = sess-2).
	idx.EnrichN(dir, 1)

	sess2 := idx.FindSession("sess-2")
	if sess2 == nil {
		t.Fatal("sess-2 not found")
	}
	if sess2.MessageCount == 0 {
		t.Error("expected sess-2 to be enriched")
	}
}

func TestEnrichNZero(t *testing.T) {
	dir := setupTestDir(t)
	idx, err := Discover(dir, nil)
	if err != nil {
		t.Fatal(err)
	}

	// EnrichN(0) should be a no-op.
	idx.EnrichN(dir, 0)
}

func TestEnrichNLargerThanTotal(t *testing.T) {
	dir := setupTestDir(t)
	idx, err := Discover(dir, nil)
	if err != nil {
		t.Fatal(err)
	}

	// Should not panic when n > total sessions.
	idx.EnrichN(dir, 1000)
}

// --- ResolveFilePath tests ---

func TestResolveFilePathStandalone(t *testing.T) {
	meta := SessionMeta{
		SessionID: "test",
		FilePath:  "/some/standalone/path.jsonl",
	}
	path, err := ResolveFilePath("/unused", meta)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if path != "/some/standalone/path.jsonl" {
		t.Errorf("expected standalone path, got %q", path)
	}
}

func TestResolveFilePathFromClaudeDir(t *testing.T) {
	meta := SessionMeta{
		SessionID: "sess-abc",
		Project:   "/Users/me/proj",
	}
	path, err := ResolveFilePath("/home/.claude", meta)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	want := "/home/.claude/projects/-Users-me-proj/sess-abc.jsonl"
	if path != want {
		t.Errorf("got %q, want %q", path, want)
	}
}

// --- GetSessions excludes tombstoned entries ---

func TestGetSessionsExcludesTombstoned(t *testing.T) {
	idx := &Index{
		Sessions: []SessionMeta{
			{SessionID: "live"},
			{SessionID: ""}, // tombstoned
			{SessionID: "also-live"},
		},
	}
	sessions := idx.GetSessions()
	if len(sessions) != 2 {
		t.Fatalf("expected 2 sessions, got %d", len(sessions))
	}
	for _, s := range sessions {
		if s.SessionID == "" {
			t.Error("tombstoned session should be excluded")
		}
	}
}

// --- Discover with dirs filter ---

func TestDiscoverWithDirsFilter(t *testing.T) {
	dir := setupTestDir(t)

	// Use the exact encoded directory name to match.
	idx, err := Discover(dir, []string{"-Users-me-project-a"})
	if err != nil {
		t.Fatal(err)
	}

	sessions := idx.GetSessions()
	for _, s := range sessions {
		if s.Project != "/Users/me/project-a" {
			t.Errorf("expected only project-a sessions, got %q", s.Project)
		}
	}
	if len(sessions) != 2 {
		t.Errorf("expected 2 sessions for project-a, got %d", len(sessions))
	}
}

func TestDiscoverWithDirsFilterNoMatch(t *testing.T) {
	dir := setupTestDir(t)

	idx, err := Discover(dir, []string{"nonexistent-project"})
	if err != nil {
		t.Fatal(err)
	}

	if len(idx.GetSessions()) != 0 {
		t.Error("expected 0 sessions for non-matching dir filter")
	}
}

// setupFilesystemOnlyDir creates a Claude dir with session files on disk but no history.jsonl.
func setupFilesystemOnlyDir(t *testing.T) string {
	t.Helper()
	dir := t.TempDir()

	projDir := filepath.Join(dir, "projects", "-Users-me-sdk-project")
	if err := os.MkdirAll(projDir, 0755); err != nil {
		t.Fatal(err)
	}

	sess := `{"type":"user","uuid":"u1","sessionId":"sdk-sess-1","timestamp":5000,"message":{"role":"user","content":[{"type":"text","text":"Hello from SDK"}]}}
{"type":"assistant","uuid":"a1","sessionId":"sdk-sess-1","timestamp":5001,"message":{"role":"assistant","model":"claude-sonnet-4-20250514","content":[{"type":"text","text":"Hi!"}],"usage":{"input_tokens":50,"output_tokens":25}}}
`
	if err := os.WriteFile(filepath.Join(projDir, "sdk-sess-1.jsonl"), []byte(sess), 0644); err != nil {
		t.Fatal(err)
	}

	sess2 := `{"type":"user","uuid":"u2","sessionId":"sdk-sess-2","timestamp":6000,"message":{"role":"user","content":[{"type":"text","text":"Another session"}]}}
`
	if err := os.WriteFile(filepath.Join(projDir, "sdk-sess-2.jsonl"), []byte(sess2), 0644); err != nil {
		t.Fatal(err)
	}

	return dir
}

func TestScanProjectDirs(t *testing.T) {
	dir := setupFilesystemOnlyDir(t)

	sessions := ScanProjectDirs(dir, nil)
	if len(sessions) != 2 {
		t.Fatalf("expected 2 sessions, got %d", len(sessions))
	}

	ids := map[string]bool{}
	for _, s := range sessions {
		ids[s.SessionID] = true
		if s.Project != "/Users/me/sdk/project" {
			t.Errorf("unexpected project %q", s.Project)
		}
		if s.Timestamp <= 0 {
			t.Error("expected positive timestamp from file mod time")
		}
	}
	if !ids["sdk-sess-1"] || !ids["sdk-sess-2"] {
		t.Error("expected both sdk-sess-1 and sdk-sess-2")
	}
}

func TestScanProjectDirsWithFilter(t *testing.T) {
	dir := setupFilesystemOnlyDir(t)

	// With matching filter.
	sessions := ScanProjectDirs(dir, map[string]struct{}{"-Users-me-sdk-project": {}})
	if len(sessions) != 2 {
		t.Fatalf("expected 2 sessions with matching filter, got %d", len(sessions))
	}

	// With non-matching filter.
	sessions = ScanProjectDirs(dir, map[string]struct{}{"other-project": {}})
	if len(sessions) != 0 {
		t.Errorf("expected 0 sessions with non-matching filter, got %d", len(sessions))
	}
}

func TestScanProjectDirsSkipsInvalidIDs(t *testing.T) {
	dir := t.TempDir()
	projDir := filepath.Join(dir, "projects", "-Users-me-proj")
	if err := os.MkdirAll(projDir, 0755); err != nil {
		t.Fatal(err)
	}
	// Valid session file.
	if err := os.WriteFile(filepath.Join(projDir, "valid-id.jsonl"), []byte(`{}`), 0644); err != nil {
		t.Fatal(err)
	}
	// Invalid: path traversal attempt.
	if err := os.WriteFile(filepath.Join(projDir, "..%2F..%2Fetc%2Fpasswd.jsonl"), []byte(`{}`), 0644); err != nil {
		t.Fatal(err)
	}

	sessions := ScanProjectDirs(dir, nil)
	if len(sessions) != 1 {
		t.Fatalf("expected 1 valid session, got %d", len(sessions))
	}
	if sessions[0].SessionID != "valid-id" {
		t.Errorf("expected valid-id, got %s", sessions[0].SessionID)
	}
}

func TestDiscoverWithoutHistory(t *testing.T) {
	dir := setupFilesystemOnlyDir(t)

	idx, err := Discover(dir, nil)
	if err != nil {
		t.Fatalf("Discover without history.jsonl should not error: %v", err)
	}

	sessions := idx.GetSessions()
	if len(sessions) != 2 {
		t.Fatalf("expected 2 filesystem-discovered sessions, got %d", len(sessions))
	}
}

func TestDiscoverMergesHistoryAndFilesystem(t *testing.T) {
	dir := setupTestDir(t) // has history.jsonl with sess-1, sess-2, sess-3

	// Add an SDK session on disk that's NOT in history.jsonl.
	projDir := filepath.Join(dir, "projects", "-Users-me-sdk-only")
	if err := os.MkdirAll(projDir, 0755); err != nil {
		t.Fatal(err)
	}
	sess := `{"type":"user","uuid":"u1","sessionId":"sdk-only-1","timestamp":9000,"message":{"role":"user","content":[{"type":"text","text":"SDK session"}]}}
`
	if err := os.WriteFile(filepath.Join(projDir, "sdk-only-1.jsonl"), []byte(sess), 0644); err != nil {
		t.Fatal(err)
	}

	idx, err := Discover(dir, nil)
	if err != nil {
		t.Fatal(err)
	}

	sessions := idx.GetSessions()
	// Should have the 3 history sessions + 1 filesystem session.
	if len(sessions) != 4 {
		t.Fatalf("expected 4 sessions (3 history + 1 filesystem), got %d", len(sessions))
	}

	// Verify the SDK session is present.
	found := false
	for _, s := range sessions {
		if s.SessionID == "sdk-only-1" {
			found = true
		}
	}
	if !found {
		t.Error("expected sdk-only-1 to be in merged results")
	}
}

func TestDiscoverHistoryTakesPrecedence(t *testing.T) {
	dir := setupTestDir(t) // has sess-1 in history with timestamp 1000

	// sess-1 already exists on disk via setupTestDir. The history entry should
	// take precedence — Discover should NOT create a duplicate.
	idx, err := Discover(dir, nil)
	if err != nil {
		t.Fatal(err)
	}

	count := 0
	for _, s := range idx.GetSessions() {
		if s.SessionID == "sess-1" {
			count++
			// History entry has timestamp 1000, not file mod time.
			if s.Timestamp != 1000 {
				t.Errorf("expected history timestamp 1000, got %d", s.Timestamp)
			}
		}
	}
	if count != 1 {
		t.Errorf("expected exactly 1 sess-1 entry, got %d", count)
	}
}

func TestAddSessionMeta(t *testing.T) {
	idx := &Index{}

	added := idx.AddSessionMeta(SessionMeta{SessionID: "new-sess", Project: "/tmp/proj", Timestamp: 1000})
	if !added {
		t.Error("expected AddSessionMeta to return true for new session")
	}

	if len(idx.GetSessions()) != 1 {
		t.Fatal("expected 1 session")
	}

	// Adding the same session again should be a no-op.
	added = idx.AddSessionMeta(SessionMeta{SessionID: "new-sess", Project: "/tmp/proj", Timestamp: 2000})
	if added {
		t.Error("expected AddSessionMeta to return false for duplicate")
	}

	if len(idx.GetSessions()) != 1 {
		t.Error("expected still 1 session after duplicate add")
	}
}

func TestEnrichSessionCorrectsCwdFromMessages(t *testing.T) {
	tests := []struct {
		name        string
		realPath    string
		encodedDir  string
		description string
	}{
		{
			name:        "hyphen in path",
			realPath:    "/Users/me/my-project",
			encodedDir:  "-Users-me-my-project",
			description: "path with hyphens should be corrected via cwd",
		},
		{
			name:        "dot in path",
			realPath:    "/Users/german.greiner/workplace",
			encodedDir:  "-Users-german-greiner-workplace",
			description: "path with dots should be corrected via cwd",
		},
		{
			name:        "underscore in path",
			realPath:    "/Users/me/my_project",
			encodedDir:  "-Users-me-my-project",
			description: "path with underscores should be corrected via cwd",
		},
		{
			name:        "space in path",
			realPath:    "/Users/me/my project",
			encodedDir:  "-Users-me-my-project",
			description: "path with spaces should be corrected via cwd",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			dir := t.TempDir()
			projDir := filepath.Join(dir, "projects", tt.encodedDir)
			if err := os.MkdirAll(projDir, 0755); err != nil {
				t.Fatal(err)
			}

			sess := fmt.Sprintf(
				`{"type":"user","uuid":"u1","sessionId":"cwd-sess","timestamp":1000,"cwd":%q,"message":{"role":"user","content":[{"type":"text","text":"hello"}]}}
{"type":"assistant","uuid":"a1","sessionId":"cwd-sess","timestamp":1001,"cwd":%q,"message":{"role":"assistant","model":"claude-sonnet-4-20250514","content":[{"type":"text","text":"hi"}],"usage":{"input_tokens":10,"output_tokens":5}}}
`, tt.realPath, tt.realPath)
			if err := os.WriteFile(filepath.Join(projDir, "cwd-sess.jsonl"), []byte(sess), 0644); err != nil {
				t.Fatal(err)
			}

			idx, err := Discover(dir, nil)
			if err != nil {
				t.Fatal(err)
			}

			if !idx.EnrichSession(dir, "cwd-sess") {
				t.Fatal("expected EnrichSession to return true")
			}

			sessions := idx.GetSessions()
			if len(sessions) != 1 {
				t.Fatalf("expected 1 session, got %d", len(sessions))
			}
			if sessions[0].Project != tt.realPath {
				t.Errorf("%s: got Project=%q, want %q", tt.description, sessions[0].Project, tt.realPath)
			}
		})
	}
}

func TestEnrichSessionFallbackToEncodedName(t *testing.T) {
	dir := t.TempDir()
	encodedDir := "-Users-me-my-project"
	projDir := filepath.Join(dir, "projects", encodedDir)
	if err := os.MkdirAll(projDir, 0755); err != nil {
		t.Fatal(err)
	}

	// Session with no cwd field.
	sess := `{"type":"user","uuid":"u1","sessionId":"no-cwd-sess","timestamp":1000,"message":{"role":"user","content":[{"type":"text","text":"hello"}]}}
`
	if err := os.WriteFile(filepath.Join(projDir, "no-cwd-sess.jsonl"), []byte(sess), 0644); err != nil {
		t.Fatal(err)
	}

	idx, err := Discover(dir, nil)
	if err != nil {
		t.Fatal(err)
	}

	if !idx.EnrichSession(dir, "no-cwd-sess") {
		t.Fatal("expected EnrichSession to return true")
	}

	sessions := idx.GetSessions()
	if len(sessions) != 1 {
		t.Fatalf("expected 1 session, got %d", len(sessions))
	}

	// The decoded path /Users/me/my/project doesn't exist on disk,
	// so it should fall back to the encoded directory name.
	if sessions[0].Project != encodedDir {
		t.Errorf("expected fallback to encoded dir %q, got %q", encodedDir, sessions[0].Project)
	}
}
