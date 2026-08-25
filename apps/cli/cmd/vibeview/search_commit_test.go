package main

import (
	"bytes"
	"context"
	"encoding/json"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/driangle/vibeview/apps/lib/claude"
	"github.com/driangle/vibeview/apps/lib/search"
)

// runSearch executes the search command and returns what it wrote to stdout.
// Usage/error text is suppressed so only the report is captured.
func runSearch(t *testing.T, claudeDir string, args ...string) (string, error) {
	t.Helper()
	logLevel := "error"
	cmd := searchCmd(&claudeDir, &logLevel)
	cmd.SetOut(&bytes.Buffer{})
	cmd.SetErr(&bytes.Buffer{})
	cmd.SetArgs(args)

	var err error
	out := captureStdout(t, func() { err = cmd.Execute() })
	return out, err
}

// initCommitRepo creates a temp repo with one commit touching parser.go and
// returns the repo path. It skips the test when git is unavailable.
func initCommitRepo(t *testing.T) string {
	t.Helper()
	if _, err := exec.LookPath("git"); err != nil {
		t.Skip("git not available")
	}

	dir := t.TempDir()
	run := func(args ...string) {
		t.Helper()
		cmd := exec.Command("git", append([]string{"-C", dir}, args...)...)
		cmd.Env = append(cmd.Environ(),
			"GIT_AUTHOR_NAME=t", "GIT_AUTHOR_EMAIL=t@example.com",
			"GIT_COMMITTER_NAME=t", "GIT_COMMITTER_EMAIL=t@example.com",
		)
		if out, err := cmd.CombinedOutput(); err != nil {
			t.Fatalf("git %s: %v\n%s", strings.Join(args, " "), err, out)
		}
	}

	run("init", "--quiet")
	if err := os.WriteFile(filepath.Join(dir, "parser.go"), []byte("package main\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	run("add", "-A")
	run("-c", "commit.gpgsign=false", "commit", "--no-verify", "-m", "feat: handle sentinel records in parser")
	return dir
}

// writeSessionAt writes a session JSONL whose messages are timestamped at ts,
// and returns the claude dir holding it.
func writeSessionAt(t *testing.T, sessionID, project, text string, ts time.Time) string {
	t.Helper()
	dir := t.TempDir()
	millis := ts.UnixMilli()

	historyLine, err := json.Marshal(map[string]any{
		"sessionId": sessionID,
		"project":   project,
		"display":   "test",
		"timestamp": millis,
	})
	if err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(dir, "history.jsonl"), historyLine, 0o644); err != nil {
		t.Fatal(err)
	}

	projectDir := filepath.Join(dir, "projects", claude.EncodeProjectPath(project))
	if err := os.MkdirAll(projectDir, 0o755); err != nil {
		t.Fatal(err)
	}

	line, err := json.Marshal(map[string]any{
		"type":      "user",
		"uuid":      "u1",
		"sessionId": sessionID,
		"timestamp": millis,
		"message": map[string]any{
			"role":    "user",
			"content": []map[string]string{{"type": "text", "text": text}},
		},
	})
	if err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(projectDir, sessionID+".jsonl"), line, 0o644); err != nil {
		t.Fatal(err)
	}
	return dir
}

func TestSearchRequiresQueryOrCommit(t *testing.T) {
	_, err := runSearch(t, t.TempDir())
	if err == nil {
		t.Fatal("expected an error when neither a query nor --commit is given")
	}
	if !strings.Contains(err.Error(), "--commit") {
		t.Errorf("error %q should mention --commit", err)
	}
}

func TestSearchCommitReportsBadRepoClearly(t *testing.T) {
	// A directory that is not a repository must produce git's own diagnosis,
	// not a panic or an empty result set.
	out, err := runSearch(t, t.TempDir(), "--commit", "HEAD", "--repo", t.TempDir())
	if err == nil {
		t.Fatalf("expected an error for a non-repository, got output: %s", out)
	}
	if !strings.Contains(err.Error(), "git") {
		t.Errorf("error %q should surface git's message", err)
	}
}

func TestSearchCommitReportsUnknownRevisionClearly(t *testing.T) {
	repo := initCommitRepo(t)

	out, err := runSearch(t, t.TempDir(), "--commit", "0123456789abcdef", "--repo", repo)
	if err == nil {
		t.Fatalf("expected an error for an unknown revision, got output: %s", out)
	}
	if !strings.Contains(err.Error(), "git") {
		t.Errorf("error %q should surface git's message", err)
	}
}

// --repo and --dirs address different things: the commit lives in the
// repository, the session lives wherever it ran. A session run from a git
// worktree records that worktree as its project, so it must still be findable
// from a commit read out of the main checkout.
func TestSearchCommitFindsSessionFromAnotherPath(t *testing.T) {
	repo := initCommitRepo(t)

	commit, err := search.ResolveCommit(context.Background(), repo, "HEAD")
	if err != nil {
		t.Fatalf("ResolveCommit: %v", err)
	}

	worktree := filepath.Join(t.TempDir(), "worktree-feature")
	claudeDir := writeSessionAt(t, "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee", worktree,
		"fixing parser.go to handle sentinel records",
		time.UnixMilli(commit.Timestamp).Add(-time.Hour))

	out, err := runSearch(t, claudeDir, "--json", "--commit", "HEAD", "--repo", repo)
	if err != nil {
		t.Fatalf("search --commit failed: %v\n%s", err, out)
	}

	var report searchReport
	if err := json.Unmarshal([]byte(out), &report); err != nil {
		t.Fatalf("parsing report: %v\noutput: %s", err, out)
	}
	if report.Total != 1 {
		t.Fatalf("Total = %d, want 1 — a session outside the repo path must still match\noutput: %s",
			report.Total, out)
	}
	if report.Results[0].Project != worktree {
		t.Errorf("Project = %q, want %q", report.Results[0].Project, worktree)
	}
}

// --repo defaults to the current directory.
func TestSearchCommitResolvesInCurrentDirectory(t *testing.T) {
	repo := initCommitRepo(t)

	cwd, err := os.Getwd()
	if err != nil {
		t.Fatal(err)
	}
	if err := os.Chdir(repo); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		if err := os.Chdir(cwd); err != nil {
			t.Fatal(err)
		}
	})

	out, err := runSearch(t, t.TempDir(), "--json", "--commit", "HEAD")
	if err != nil {
		t.Fatalf("search --commit failed: %v\n%s", err, out)
	}

	var report searchReport
	if err := json.Unmarshal([]byte(out), &report); err != nil {
		t.Fatalf("parsing report: %v\noutput: %s", err, out)
	}
	if report.Commit == nil {
		t.Fatal("report should echo the commit resolved from the current directory")
	}
	if report.Commit.Subject != "feat: handle sentinel records in parser" {
		t.Errorf("Commit.Subject = %q", report.Commit.Subject)
	}
}

// The end-to-end payoff: a session that never mentions the commit hash is found
// through the commit's changed files and subject.
func TestSearchCommitFindsSessionWithoutHashMention(t *testing.T) {
	repo := initCommitRepo(t)

	commit, err := search.ResolveCommit(context.Background(), repo, "HEAD")
	if err != nil {
		t.Fatalf("ResolveCommit: %v", err)
	}

	claudeDir := writeSessionAt(t, "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee", "/Users/test/proj",
		"fixing parser.go to handle sentinel records",
		time.UnixMilli(commit.Timestamp).Add(-time.Hour))

	out, err := runSearch(t, claudeDir, "--json", "--commit", "HEAD", "--repo", repo)
	if err != nil {
		t.Fatalf("search --commit failed: %v\n%s", err, out)
	}

	var report searchReport
	if err := json.Unmarshal([]byte(out), &report); err != nil {
		t.Fatalf("parsing report: %v\noutput: %s", err, out)
	}

	if report.Total != 1 {
		t.Fatalf("Total = %d, want 1\noutput: %s", report.Total, out)
	}
	if report.Commit == nil {
		t.Fatal("report should echo the resolved commit")
	}
	if report.Commit.Hash != commit.ShortHash {
		t.Errorf("Commit.Hash = %q, want %q", report.Commit.Hash, commit.ShortHash)
	}
	if len(report.Commit.Files) != 1 || report.Commit.Files[0] != "parser.go" {
		t.Errorf("Commit.Files = %v, want [parser.go]", report.Commit.Files)
	}
}

// A session outside --window is excluded even though it matches the commit's
// terms — the window is what keeps common paths from matching unrelated work.
func TestSearchCommitWindowExcludesDistantSessions(t *testing.T) {
	repo := initCommitRepo(t)

	commit, err := search.ResolveCommit(context.Background(), repo, "HEAD")
	if err != nil {
		t.Fatalf("ResolveCommit: %v", err)
	}

	claudeDir := writeSessionAt(t, "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee", "/Users/test/proj",
		"fixing parser.go to handle sentinel records",
		time.UnixMilli(commit.Timestamp).Add(-72*time.Hour))

	// Default window (24h) excludes it.
	out, err := runSearch(t, claudeDir, "--json", "--commit", "HEAD", "--repo", repo)
	if err != nil {
		t.Fatalf("search --commit failed: %v\n%s", err, out)
	}
	var report searchReport
	if err := json.Unmarshal([]byte(out), &report); err != nil {
		t.Fatalf("parsing report: %v", err)
	}
	if report.Total != 0 {
		t.Errorf("Total = %d, want 0 outside the default window", report.Total)
	}

	// Widening the window brings it back.
	out, err = runSearch(t, claudeDir, "--json", "--commit", "HEAD", "--repo", repo, "--window", "96h")
	if err != nil {
		t.Fatalf("search --commit --window failed: %v\n%s", err, out)
	}
	report = searchReport{}
	if err := json.Unmarshal([]byte(out), &report); err != nil {
		t.Fatalf("parsing report: %v", err)
	}
	if report.Total != 1 {
		t.Errorf("Total = %d, want 1 with a 96h window", report.Total)
	}
}
