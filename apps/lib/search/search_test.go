package search

import (
	"context"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"testing"

	"github.com/driangle/vibeview/apps/lib/session"
)

// writeSession writes a single-message session JSONL file to dir and returns a
// SessionMeta whose FilePath points at it, so ResolveFilePath resolves directly
// to the file without needing a ~/.claude directory layout.
func writeSession(t *testing.T, dir, id, project, text string) session.SessionMeta {
	t.Helper()
	line := `{"type":"user","message":{"role":"user","content":[{"type":"text","text":` +
		strconv.Quote(text) + `}]}}` + "\n"
	path := filepath.Join(dir, id+".jsonl")
	if err := os.WriteFile(path, []byte(line), 0o644); err != nil {
		t.Fatalf("write session %s: %v", id, err)
	}
	return session.SessionMeta{SessionID: id, Project: project, FilePath: path}
}

// writeRawSession writes the given JSONL lines verbatim to a session file so
// tests can exercise specific message shapes (string content, tool_use, etc.).
func writeRawSession(t *testing.T, dir, id, project string, lines ...string) session.SessionMeta {
	t.Helper()
	path := filepath.Join(dir, id+".jsonl")
	if err := os.WriteFile(path, []byte(strings.Join(lines, "\n")+"\n"), 0o644); err != nil {
		t.Fatalf("write session %s: %v", id, err)
	}
	return session.SessionMeta{SessionID: id, Project: project, FilePath: path}
}

func indexOf(metas ...session.SessionMeta) *session.Index {
	return &session.Index{Sessions: metas}
}

func TestSearchFindsMatch(t *testing.T) {
	dir := t.TempDir()
	idx := indexOf(
		writeSession(t, dir, "sess-hit", "/proj/a", "the quick brown fox jumps"),
		writeSession(t, dir, "sess-miss", "/proj/b", "nothing relevant here"),
	)

	results := Search(context.Background(), idx, Options{Query: "brown fox", Limit: 10})

	if len(results) != 1 {
		t.Fatalf("expected 1 result, got %d", len(results))
	}
	if results[0].Meta.SessionID != "sess-hit" {
		t.Errorf("matched wrong session: got %q, want %q", results[0].Meta.SessionID, "sess-hit")
	}
	if !strings.Contains(results[0].Snippet, "brown fox") {
		t.Errorf("snippet %q does not contain the match", results[0].Snippet)
	}
}

func TestSearchIsCaseInsensitive(t *testing.T) {
	dir := t.TempDir()
	idx := indexOf(writeSession(t, dir, "sess-1", "/proj", "Deploying to Production now"))

	results := Search(context.Background(), idx, Options{Query: "PRODUCTION", Limit: 10})

	if len(results) != 1 {
		t.Fatalf("expected 1 case-insensitive result, got %d", len(results))
	}
}

func TestSearchNoMatchReturnsEmpty(t *testing.T) {
	dir := t.TempDir()
	idx := indexOf(writeSession(t, dir, "sess-1", "/proj", "hello world"))

	results := Search(context.Background(), idx, Options{Query: "absent", Limit: 10})

	if len(results) != 0 {
		t.Fatalf("expected no results, got %d", len(results))
	}
}

func TestSearchRespectsLimit(t *testing.T) {
	dir := t.TempDir()
	idx := indexOf(
		writeSession(t, dir, "sess-1", "/proj", "shared keyword one"),
		writeSession(t, dir, "sess-2", "/proj", "shared keyword two"),
		writeSession(t, dir, "sess-3", "/proj", "shared keyword three"),
	)

	results := Search(context.Background(), idx, Options{Query: "shared keyword", Limit: 1})

	if len(results) != 1 {
		t.Fatalf("expected exactly 1 result under Limit=1, got %d", len(results))
	}
}

func TestSearchFiltersByDirs(t *testing.T) {
	dir := t.TempDir()
	idx := indexOf(
		writeSession(t, dir, "sess-web", "/Users/me/web", "matching term"),
		writeSession(t, dir, "sess-api", "/Users/me/api", "matching term"),
	)

	results := Search(context.Background(), idx, Options{
		Query: "matching term",
		Limit: 10,
		Dirs:  []string{"/Users/me/web"},
	})

	if len(results) != 1 {
		t.Fatalf("expected 1 result from filtered dir, got %d", len(results))
	}
	if results[0].Meta.SessionID != "sess-web" {
		t.Errorf("dir filter matched wrong session: %q", results[0].Meta.SessionID)
	}
}

func TestSearchRedactsSecretsInSnippet(t *testing.T) {
	dir := t.TempDir()
	idx := indexOf(writeSession(t, dir, "sess-1", "/proj",
		"run mysql --password=hunter2 --host=localhost to connect"))

	results := Search(context.Background(), idx, Options{Query: "password", Limit: 10})

	if len(results) != 1 {
		t.Fatalf("expected 1 result, got %d", len(results))
	}
	if strings.Contains(results[0].Snippet, "hunter2") {
		t.Errorf("snippet leaked secret: %q", results[0].Snippet)
	}
	if !strings.Contains(results[0].Snippet, "[REDACTED]") {
		t.Errorf("snippet was not redacted: %q", results[0].Snippet)
	}
}

func TestSearchHonorsCanceledContext(t *testing.T) {
	dir := t.TempDir()
	idx := indexOf(writeSession(t, dir, "sess-1", "/proj", "findable content"))

	ctx, cancel := context.WithCancel(context.Background())
	cancel()

	results := Search(ctx, idx, Options{Query: "findable", Limit: 10})

	if len(results) != 0 {
		t.Fatalf("expected no results with canceled context, got %d", len(results))
	}
}

func TestSearchMatchesStringFormUserPrompt(t *testing.T) {
	dir := t.TempDir()
	// User prompts commonly carry content as a bare string, not an array.
	idx := indexOf(writeRawSession(t, dir, "sess-1", "/proj",
		`{"type":"user","message":{"role":"user","content":"please refactor review cli"}}`))

	results := Search(context.Background(), idx, Options{Query: "refactor review cli", Limit: 10})

	if len(results) != 1 {
		t.Fatalf("expected 1 result for string-form user prompt, got %d", len(results))
	}
	if !strings.Contains(results[0].Snippet, "refactor review cli") {
		t.Errorf("snippet %q does not contain the match", results[0].Snippet)
	}
}

func TestSearchMatchesAssistantArrayContent(t *testing.T) {
	dir := t.TempDir()
	idx := indexOf(writeRawSession(t, dir, "sess-1", "/proj",
		`{"type":"assistant","message":{"role":"assistant","content":[{"type":"text","text":"Here is the migration plan"}]}}`))

	results := Search(context.Background(), idx, Options{Query: "migration plan", Limit: 10})

	if len(results) != 1 {
		t.Fatalf("expected 1 result for assistant array content, got %d", len(results))
	}
}

func TestSearchMatchesToolInput(t *testing.T) {
	dir := t.TempDir()
	idx := indexOf(writeRawSession(t, dir, "sess-1", "/proj",
		`{"type":"assistant","message":{"role":"assistant","content":[{"type":"tool_use","id":"t1","name":"Bash","input":{"command":"grep -r needle apps/lib/search/search.go"}}]}}`))

	// A file path used only inside a tool input should be findable.
	results := Search(context.Background(), idx, Options{Query: "apps/lib/search/search.go", Limit: 10})

	if len(results) != 1 {
		t.Fatalf("expected 1 result matching tool input, got %d", len(results))
	}
	if !strings.Contains(results[0].Snippet, "apps/lib/search/search.go") {
		t.Errorf("snippet %q does not contain the tool-input match", results[0].Snippet)
	}
}

func TestSearchMatchesToolResultContent(t *testing.T) {
	dir := t.TempDir()
	idx := indexOf(writeRawSession(t, dir, "sess-1", "/proj",
		`{"type":"user","message":{"role":"user","content":[{"type":"tool_result","tool_use_id":"t1","content":[{"type":"text","text":"compilation error: undefined symbol frobnicate"}]}]}}`))

	results := Search(context.Background(), idx, Options{Query: "frobnicate", Limit: 10})

	if len(results) != 1 {
		t.Fatalf("expected 1 result matching tool result content, got %d", len(results))
	}
}

func TestSearchRanksByRelevance(t *testing.T) {
	dir := t.TempDir()
	// sess-low mentions the term once; sess-high mentions it several times.
	idx := indexOf(
		writeRawSession(t, dir, "sess-low", "/proj",
			`{"type":"user","message":{"role":"user","content":"a passing mention of widget here"}}`),
		writeRawSession(t, dir, "sess-high", "/proj",
			`{"type":"user","message":{"role":"user","content":"widget widget widget — all about the widget"}}`),
	)

	results := Search(context.Background(), idx, Options{Query: "widget", Limit: 10})

	if len(results) != 2 {
		t.Fatalf("expected 2 results, got %d", len(results))
	}
	if results[0].Meta.SessionID != "sess-high" {
		t.Errorf("expected highest-scoring session first, got %q", results[0].Meta.SessionID)
	}
}

func TestSearchRankingSurvivesLimitTruncation(t *testing.T) {
	dir := t.TempDir()
	// The most relevant session is created first in the index but must still win
	// under Limit=1 — proving results are ranked before truncation, not by order.
	idx := indexOf(
		writeRawSession(t, dir, "sess-weak", "/proj",
			`{"type":"user","message":{"role":"user","content":"one target reference"}}`),
		writeRawSession(t, dir, "sess-strong", "/proj",
			`{"type":"user","message":{"role":"user","content":"target target target target"}}`),
	)

	results := Search(context.Background(), idx, Options{Query: "target", Limit: 1})

	if len(results) != 1 {
		t.Fatalf("expected 1 result under Limit=1, got %d", len(results))
	}
	if results[0].Meta.SessionID != "sess-strong" {
		t.Errorf("Limit truncated before ranking: got %q, want sess-strong", results[0].Meta.SessionID)
	}
}

func TestSearchSnippetPrefersTextOverToolInput(t *testing.T) {
	dir := t.TempDir()
	// Same term appears in both a tool input and a human-readable text block;
	// the snippet should be drawn from the higher-weight text block.
	idx := indexOf(writeRawSession(t, dir, "sess-1", "/proj",
		`{"type":"assistant","message":{"role":"assistant","content":[`+
			`{"type":"tool_use","id":"t1","name":"Grep","input":{"pattern":"beacon"}},`+
			`{"type":"text","text":"I searched for the beacon and here is what it means"}]}}`))

	results := Search(context.Background(), idx, Options{Query: "beacon", Limit: 10})

	if len(results) != 1 {
		t.Fatalf("expected 1 result, got %d", len(results))
	}
	if !strings.Contains(results[0].Snippet, "here is what it means") {
		t.Errorf("snippet should come from the text block, got %q", results[0].Snippet)
	}
}

func TestBuildSnippet(t *testing.T) {
	tests := []struct {
		name   string
		text   string
		query  string
		maxLen int
		want   string
	}{
		{
			name:   "short text with match returns full text",
			text:   "hello brown fox",
			query:  "brown",
			maxLen: 120,
			want:   "hello brown fox",
		},
		{
			name:   "query absent and text within maxLen returns text unchanged",
			text:   "no match here",
			query:  "zzz",
			maxLen: 120,
			want:   "no match here",
		},
		{
			name:   "query absent and text over maxLen truncates with ellipsis",
			text:   strings.Repeat("a", 130),
			query:  "zzz",
			maxLen: 120,
			want:   strings.Repeat("a", 120) + "...",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := buildSnippet(tt.text, tt.query, tt.maxLen)
			if got != tt.want {
				t.Errorf("buildSnippet(%q, %q, %d) = %q, want %q", tt.text, tt.query, tt.maxLen, got, tt.want)
			}
		})
	}
}

func TestBuildSnippetCentersOnMatchInLongText(t *testing.T) {
	prefix := strings.Repeat("x ", 100)
	suffix := strings.Repeat("y ", 100)
	text := prefix + "NEEDLE" + suffix

	got := buildSnippet(text, "NEEDLE", 40)

	if !strings.Contains(got, "NEEDLE") {
		t.Fatalf("snippet %q does not contain the match", got)
	}
	if !strings.HasPrefix(got, "...") || !strings.HasSuffix(got, "...") {
		t.Errorf("snippet from mid-text should be ellipsized on both ends: %q", got)
	}
	if len(got) > 40+len("......") {
		t.Errorf("snippet %q longer than window + ellipses (%d chars)", got, len(got))
	}
}
