package session

import (
	"math"
	"os"
	"path/filepath"
	"testing"

	"github.com/driangle/vibeview/internal/claude"
)

func TestMain(m *testing.M) {
	claude.LoadPricing([]byte(`{
		"claude-opus-4":   {"inputPerM": 15, "outputPerM": 75, "cacheReadPerM": 1.5, "cacheWritePerM": 18.75},
		"claude-sonnet-4": {"inputPerM": 3, "outputPerM": 15, "cacheReadPerM": 0.30, "cacheWritePerM": 3.75},
		"claude-haiku-4":  {"inputPerM": 0.80, "outputPerM": 4, "cacheReadPerM": 0.08, "cacheWritePerM": 1}
	}`))
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

	idx, err := Discover(dir)
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
	// Cost is calculated from token counts and model pricing, not from the costUSD field in JSONL.
	// sonnet-4: (100×3 + 50×15 + 20×0.30 + 10×3.75) / 1M = 0.0010935
	if math.Abs(sess1.Usage.CostUSD-0.0010935) > 1e-9 {
		t.Errorf("sess-1 usage.CostUSD = %f, want ~0.0010935", sess1.Usage.CostUSD)
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
	// opus-4: (200×15 + 100×75) / 1M = 0.0105
	if math.Abs(sess2.Usage.CostUSD-0.0105) > 1e-9 {
		t.Errorf("sess-2 usage.CostUSD = %f, want ~0.0105", sess2.Usage.CostUSD)
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

	idx, err := Discover(dir)
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
	// sonnet-4 msg1: (100×3 + 50×15 + 10×0.30 + 5×3.75) / 1M = 0.00107175
	// sonnet-4 msg2: (200×3 + 100×15 + 30×0.30 + 15×3.75) / 1M = 0.00216525
	// total = 0.003237
	if math.Abs(u.CostUSD-0.003237) > 1e-9 {
		t.Errorf("CostUSD = %f, want ~0.003237", u.CostUSD)
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

	idx, err := Discover(dir)
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
