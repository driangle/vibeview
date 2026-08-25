package search

import (
	"context"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"
)

// initRepo creates a temp git repository with one commit touching the given
// files, and returns the repo path. It skips the test when git is unavailable.
func initRepo(t *testing.T, subject string, files ...string) string {
	t.Helper()
	if _, err := exec.LookPath("git"); err != nil {
		t.Skip("git not available")
	}

	dir := t.TempDir()
	run := func(args ...string) {
		t.Helper()
		cmd := exec.Command("git", append([]string{"-C", dir}, args...)...)
		// Identity and hook config must be explicit: the test must not depend
		// on (or be broken by) the developer's global git configuration.
		cmd.Env = append(cmd.Environ(),
			"GIT_AUTHOR_NAME=t", "GIT_AUTHOR_EMAIL=t@example.com",
			"GIT_COMMITTER_NAME=t", "GIT_COMMITTER_EMAIL=t@example.com",
		)
		if out, err := cmd.CombinedOutput(); err != nil {
			t.Fatalf("git %s: %v\n%s", strings.Join(args, " "), err, out)
		}
	}

	run("init", "--quiet")
	for _, f := range files {
		path := filepath.Join(dir, f)
		if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
			t.Fatalf("mkdir for %s: %v", f, err)
		}
		if err := os.WriteFile(path, []byte("content\n"), 0o644); err != nil {
			t.Fatalf("write %s: %v", f, err)
		}
	}
	run("add", "-A")
	run("-c", "commit.gpgsign=false", "commit", "--no-verify", "-m", subject)
	return dir
}

func TestResolveCommitReadsMetadataAndFiles(t *testing.T) {
	repo := initRepo(t, "feat(search): add commit lookup", "apps/lib/search/commit.go", "README.md")

	c, err := ResolveCommit(context.Background(), repo, "HEAD")
	if err != nil {
		t.Fatalf("ResolveCommit: %v", err)
	}

	if len(c.Hash) != 40 {
		t.Errorf("Hash = %q, want a 40-character hash", c.Hash)
	}
	if c.ShortHash == "" || !strings.HasPrefix(c.Hash, c.ShortHash) {
		t.Errorf("ShortHash %q is not a prefix of Hash %q", c.ShortHash, c.Hash)
	}
	if c.Subject != "feat(search): add commit lookup" {
		t.Errorf("Subject = %q", c.Subject)
	}
	if c.Timestamp <= 0 {
		t.Errorf("Timestamp = %d, want a positive epoch millis value", c.Timestamp)
	}
	// Epoch millis, not seconds: a seconds value would be ~1e9.
	if c.Timestamp < 1e12 {
		t.Errorf("Timestamp = %d, want epoch millis", c.Timestamp)
	}

	want := map[string]bool{"apps/lib/search/commit.go": false, "README.md": false}
	for _, f := range c.Files {
		if _, ok := want[f]; !ok {
			t.Errorf("unexpected file %q", f)
			continue
		}
		want[f] = true
	}
	for f, found := range want {
		if !found {
			t.Errorf("missing changed file %q, got %v", f, c.Files)
		}
	}
}

func TestResolveCommitErrors(t *testing.T) {
	repo := initRepo(t, "chore: init", "a.txt")

	tests := []struct {
		name    string
		dir     string
		ref     string
		wantMsg string
	}{
		{name: "unknown revision", dir: repo, ref: "deadbeefdeadbeef", wantMsg: "git"},
		{name: "not a repository", dir: t.TempDir(), ref: "HEAD", wantMsg: "git"},
		{name: "empty ref", dir: repo, ref: "  ", wantMsg: "no commit reference"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := ResolveCommit(context.Background(), tt.dir, tt.ref)
			if err == nil {
				t.Fatal("expected an error, got nil")
			}
			if !strings.Contains(err.Error(), tt.wantMsg) {
				t.Errorf("error %q does not mention %q", err, tt.wantMsg)
			}
		})
	}
}

func TestCommitTermsCoverHashPathsAndSubject(t *testing.T) {
	c := Commit{
		Hash:      "0875806abcdef0123456789abcdef0123456789a",
		ShortHash: "0875806",
		Subject:   "feat(parser): support file-history-delta message type",
		Files:     []string{"apps/lib/claude/parser.go"},
	}

	terms := c.Terms()
	got := make(map[string]bool, len(terms))
	for _, term := range terms {
		got[term] = true
	}

	for _, want := range []string{
		c.Hash,
		"0875806",
		"apps/lib/claude/parser.go", // matches the absolute path in a transcript
		"parser.go",                 // matches prose naming the file alone
		"file-history-delta",
		"message",
	} {
		if !got[want] {
			t.Errorf("missing term %q; got %v", want, terms)
		}
	}

	// The conventional-commit prefix is metadata, not a search term, and short
	// or generic words match nearly every session.
	for _, unwanted := range []string{"feat", "parser):", "type", "support"} {
		if got[unwanted] {
			t.Errorf("unexpected term %q; got %v", unwanted, terms)
		}
	}
}

func TestCommitTermsAreDistinct(t *testing.T) {
	// A subject word that repeats a path basename must not yield two terms:
	// duplicates would inflate coverage ranking for a single facet.
	c := Commit{
		Hash:      "abc123",
		ShortHash: "abc123",
		Subject:   "rewrite search.go internals",
		Files:     []string{"search.go", "search.go"},
	}

	seen := make(map[string]bool)
	for _, term := range c.Terms() {
		if seen[term] {
			t.Errorf("duplicate term %q in %v", term, c.Terms())
		}
		seen[term] = true
	}
}

func TestCommitQueryQuotesTerms(t *testing.T) {
	c := Commit{ShortHash: "abc1234", Files: []string{"apps/lib/search/search.go"}}

	// Quoting keeps each path a single term when the query is parsed back.
	terms := parseQuery(c.Query())
	found := false
	for _, term := range terms {
		if term == "apps/lib/search/search.go" {
			found = true
		}
	}
	if !found {
		t.Errorf("path did not survive as one term: %v", terms)
	}
}

func TestCommitQuerySurvivesQuotesInSubject(t *testing.T) {
	// A quote in the subject would otherwise unbalance the quoted query.
	c := Commit{ShortHash: "abc1234", Subject: `handle "quoted" identifiers`}

	terms := parseQuery(c.Query())
	for _, term := range terms {
		if strings.Contains(term, `"`) {
			t.Errorf("term %q retains a quote character", term)
		}
	}
	if !contains(terms, "quoted") || !contains(terms, "identifiers") {
		t.Errorf("subject words lost: %v", terms)
	}
}

func contains(haystack []string, needle string) bool {
	for _, s := range haystack {
		if s == needle {
			return true
		}
	}
	return false
}
