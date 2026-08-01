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
