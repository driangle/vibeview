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

// atTime returns meta with an explicit [start, end] time window.
func atTime(meta session.SessionMeta, start, end int64) session.SessionMeta {
	meta.Timestamp = start
	meta.StartTime = start
	meta.EndTime = end
	return meta
}

func TestSearchFiltersByTimeWindow(t *testing.T) {
	dir := t.TempDir()
	const hour = int64(3600 * 1000)

	// All three sessions match the query; only the window separates them.
	inside := atTime(writeSession(t, dir, "sess-inside", "/proj", "matching term"), 10*hour, 11*hour)
	before := atTime(writeSession(t, dir, "sess-before", "/proj", "matching term"), 1*hour, 2*hour)
	after := atTime(writeSession(t, dir, "sess-after", "/proj", "matching term"), 50*hour, 51*hour)
	// A session straddling the window's start overlaps it, so it belongs.
	straddling := atTime(writeSession(t, dir, "sess-straddle", "/proj", "matching term"), 8*hour, 10*hour)

	idx := indexOf(inside, before, after, straddling)

	results := Search(context.Background(), idx, Options{
		Query:  "matching term",
		Limit:  10,
		After:  9 * hour,
		Before: 12 * hour,
	})

	got := make(map[string]bool, len(results))
	for _, r := range results {
		got[r.Meta.SessionID] = true
	}
	if !got["sess-inside"] || !got["sess-straddle"] {
		t.Errorf("window dropped overlapping sessions: %v", got)
	}
	if got["sess-before"] || got["sess-after"] {
		t.Errorf("window kept non-overlapping sessions: %v", got)
	}
}

func TestSearchTimeWindowBoundsAreIndependent(t *testing.T) {
	dir := t.TempDir()
	const hour = int64(3600 * 1000)

	early := atTime(writeSession(t, dir, "sess-early", "/proj", "matching term"), 1*hour, 2*hour)
	late := atTime(writeSession(t, dir, "sess-late", "/proj", "matching term"), 50*hour, 51*hour)
	idx := indexOf(early, late)

	// Only After set: everything from that point on.
	results := Search(context.Background(), idx, Options{Query: "matching term", Limit: 10, After: 10 * hour})
	if len(results) != 1 || results[0].Meta.SessionID != "sess-late" {
		t.Errorf("After-only bound returned %d results, want just sess-late", len(results))
	}

	// Only Before set: everything up to that point.
	results = Search(context.Background(), idx, Options{Query: "matching term", Limit: 10, Before: 10 * hour})
	if len(results) != 1 || results[0].Meta.SessionID != "sess-early" {
		t.Errorf("Before-only bound returned %d results, want just sess-early", len(results))
	}

	// Neither bound set: no time filtering at all.
	results = Search(context.Background(), idx, Options{Query: "matching term", Limit: 10})
	if len(results) != 2 {
		t.Errorf("unbounded search returned %d results, want 2", len(results))
	}
}

func TestSearchTimeWindowExcludesUntimestampedSessions(t *testing.T) {
	dir := t.TempDir()
	const hour = int64(3600 * 1000)

	// A session with no usable timestamp cannot be shown to fall in the window,
	// so a bounded search must leave it out rather than guess.
	idx := indexOf(
		writeSession(t, dir, "sess-no-time", "/proj", "matching term"),
		atTime(writeSession(t, dir, "sess-timed", "/proj", "matching term"), 10*hour, 11*hour),
	)

	results := Search(context.Background(), idx, Options{
		Query: "matching term", Limit: 10, After: 9 * hour, Before: 12 * hour,
	})

	if len(results) != 1 || results[0].Meta.SessionID != "sess-timed" {
		t.Fatalf("expected only sess-timed, got %d results", len(results))
	}
}

// A commit's query must find the session that produced it even when the
// transcript never quotes the hash — the whole point of --commit.
func TestSearchFindsSessionByCommitQueryWithoutHash(t *testing.T) {
	dir := t.TempDir()
	const hour = int64(3600 * 1000)

	commit := Commit{
		Hash:      "0875806abcdef0123456789abcdef0123456789a",
		ShortHash: "0875806",
		Subject:   "feat(parser): support file-history-delta messages",
		Files:     []string{"apps/lib/claude/parser.go"},
		Timestamp: 10 * hour,
	}

	// The producing session edited the file and discussed the subject, but
	// never mentions the hash.
	producer := atTime(writeSession(t, dir, "sess-producer", "/proj",
		"editing /Users/me/proj/apps/lib/claude/parser.go to handle file-history-delta messages"),
		9*hour, 10*hour)
	// Another session touched the same file, but weeks outside the window.
	unrelated := atTime(writeSession(t, dir, "sess-old", "/proj",
		"reading /Users/me/proj/apps/lib/claude/parser.go"), 400*hour, 401*hour)

	idx := indexOf(producer, unrelated)

	results := Search(context.Background(), idx, Options{
		Query:  commit.Query(),
		Limit:  10,
		After:  commit.Timestamp - 24*hour,
		Before: commit.Timestamp + 24*hour,
	})

	if len(results) != 1 {
		t.Fatalf("expected 1 result, got %d", len(results))
	}
	if results[0].Meta.SessionID != "sess-producer" {
		t.Errorf("matched %q, want sess-producer", results[0].Meta.SessionID)
	}
}

// When several sessions fall in the window, the one matching more facets of the
// commit ranks first.
func TestSearchRanksBroaderCommitMatchFirst(t *testing.T) {
	dir := t.TempDir()
	const hour = int64(3600 * 1000)

	commit := Commit{
		ShortHash: "0875806",
		Subject:   "fix parser handling of delta records",
		Files:     []string{"apps/lib/claude/parser.go", "apps/lib/claude/delta.go"},
		Timestamp: 10 * hour,
	}

	broad := atTime(writeSession(t, dir, "sess-broad", "/proj",
		"touched apps/lib/claude/parser.go and apps/lib/claude/delta.go for delta records handling"),
		9*hour, 10*hour)
	narrow := atTime(writeSession(t, dir, "sess-narrow", "/proj",
		"just skimmed apps/lib/claude/parser.go"), 9*hour, 10*hour)

	idx := indexOf(narrow, broad)

	results := Search(context.Background(), idx, Options{
		Query:  commit.Query(),
		Limit:  10,
		After:  commit.Timestamp - 24*hour,
		Before: commit.Timestamp + 24*hour,
	})

	if len(results) != 2 {
		t.Fatalf("expected 2 results, got %d", len(results))
	}
	if results[0].Meta.SessionID != "sess-broad" {
		t.Errorf("ranked %q first, want sess-broad", results[0].Meta.SessionID)
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

func TestSearchMatchesNonAdjacentTerms(t *testing.T) {
	dir := t.TempDir()
	// The three terms all appear in the session but never as a contiguous
	// phrase — the natural topical query that previously returned nothing.
	idx := indexOf(writeRawSession(t, dir, "sess-1", "/proj",
		`{"type":"user","message":{"role":"user","content":"please refactor the cli and also review the output"}}`))

	results := Search(context.Background(), idx, Options{Query: "refactor review cli", Limit: 10})

	if len(results) != 1 {
		t.Fatalf("expected 1 result for non-adjacent terms, got %d", len(results))
	}
}

func TestSearchRanksByTermCoverage(t *testing.T) {
	dir := t.TempDir()
	// sess-partial repeats one term many times; sess-all mentions every term
	// once. Coverage must win over raw frequency.
	idx := indexOf(
		writeRawSession(t, dir, "sess-partial", "/proj",
			`{"type":"user","message":{"role":"user","content":"refactor refactor refactor refactor refactor"}}`),
		writeRawSession(t, dir, "sess-all", "/proj",
			`{"type":"user","message":{"role":"user","content":"one refactor, one review, one cli mention"}}`),
	)

	results := Search(context.Background(), idx, Options{Query: "refactor review cli", Limit: 10})

	if len(results) != 2 {
		t.Fatalf("expected 2 results, got %d", len(results))
	}
	if results[0].Meta.SessionID != "sess-all" {
		t.Errorf("expected full-coverage session first, got %q", results[0].Meta.SessionID)
	}
}

func TestSearchQuotedPhraseRequiresAdjacency(t *testing.T) {
	dir := t.TempDir()
	idx := indexOf(
		writeRawSession(t, dir, "sess-phrase", "/proj",
			`{"type":"user","message":{"role":"user","content":"the refactor review cli work"}}`),
		writeRawSession(t, dir, "sess-scattered", "/proj",
			`{"type":"user","message":{"role":"user","content":"refactor here, review there, cli elsewhere"}}`),
	)

	results := Search(context.Background(), idx, Options{Query: `"refactor review cli"`, Limit: 10})

	if len(results) != 1 {
		t.Fatalf("expected only the adjacent-phrase session, got %d", len(results))
	}
	if results[0].Meta.SessionID != "sess-phrase" {
		t.Errorf("quoted phrase matched wrong session: %q", results[0].Meta.SessionID)
	}
}

func TestSearchEmptyQueryReturnsNothing(t *testing.T) {
	dir := t.TempDir()
	idx := indexOf(writeSession(t, dir, "sess-1", "/proj", "some content"))

	results := Search(context.Background(), idx, Options{Query: "   ", Limit: 10})

	if len(results) != 0 {
		t.Fatalf("expected no results for empty query, got %d", len(results))
	}
}

func TestSearchSnippetPrefersFieldCoveringMoreTerms(t *testing.T) {
	dir := t.TempDir()
	// Two text blocks at the same weight: the first matches one query term, the
	// second matches both. The snippet should come from the richer sentence.
	idx := indexOf(writeRawSession(t, dir, "sess-1", "/proj",
		`{"type":"assistant","message":{"role":"assistant","content":[`+
			`{"type":"text","text":"an offhand mention of alpha in passing"},`+
			`{"type":"text","text":"the core discussion weaving alpha and beta together"}]}}`))

	results := Search(context.Background(), idx, Options{Query: "alpha beta", Limit: 10})

	if len(results) != 1 {
		t.Fatalf("expected 1 result, got %d", len(results))
	}
	if !strings.Contains(results[0].Snippet, "core discussion") {
		t.Errorf("snippet should come from the field covering both terms, got %q", results[0].Snippet)
	}
}

func TestParseQuery(t *testing.T) {
	tests := []struct {
		name string
		raw  string
		want []string
	}{
		{"bare words split into terms", "refactor review cli", []string{"refactor", "review", "cli"}},
		{"quoted span is one phrase term", `"refactor review" cli`, []string{"refactor review", "cli"}},
		{"lowercased", "Refactor REVIEW", []string{"refactor", "review"}},
		{"collapses extra whitespace", "  a   b  ", []string{"a", "b"}},
		{"empty query yields no terms", "   ", nil},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := parseQuery(tt.raw)
			if len(got) != len(tt.want) {
				t.Fatalf("parseQuery(%q) = %v, want %v", tt.raw, got, tt.want)
			}
			for i := range got {
				if got[i] != tt.want[i] {
					t.Errorf("parseQuery(%q)[%d] = %q, want %q", tt.raw, i, got[i], tt.want[i])
				}
			}
		})
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
