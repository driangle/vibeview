package main

import (
	"encoding/json"
	"io"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/driangle/vibeview/apps/lib/claude"
	"github.com/spf13/cobra"
)

// The contract these tests lock in: with --json, a command writes exactly one
// JSON document to stdout and nothing else. All progress, diagnostics, and
// human-readable output must go to stderr. This guards against a regression
// where an ungated fmt.Print* is added before the --json branch.

// writeJSONFixture creates a minimal but complete claude data directory with a
// single discoverable, enrichable session and returns (claudeDir, sessionID).
func writeJSONFixture(t *testing.T) (string, string) {
	t.Helper()
	dir := t.TempDir()
	sessionID := "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"
	project := "/Users/test/jsonproject"

	historyLine, _ := json.Marshal(map[string]any{
		"sessionId": sessionID,
		"project":   project,
		"display":   "json output test",
		"timestamp": 1711000000000,
	})
	if err := os.WriteFile(filepath.Join(dir, "history.jsonl"), historyLine, 0644); err != nil {
		t.Fatal(err)
	}

	projectDir := filepath.Join(dir, "projects", claude.EncodeProjectPath(project))
	if err := os.MkdirAll(projectDir, 0755); err != nil {
		t.Fatal(err)
	}

	sessionContent := strings.Join([]string{
		`{"type":"user","uuid":"u1","sessionId":"` + sessionID + `","timestamp":1711000000000,"message":{"role":"user","content":[{"type":"text","text":"help me fix the database migration"}]}}`,
		`{"type":"assistant","uuid":"a1","sessionId":"` + sessionID + `","timestamp":1711000001000,"message":{"role":"assistant","model":"claude-sonnet-4-20250514","content":[{"type":"text","text":"I will help with the database migration."}],"usage":{"input_tokens":50,"output_tokens":30}}}`,
	}, "\n")
	sessionPath := filepath.Join(projectDir, sessionID+".jsonl")
	if err := os.WriteFile(sessionPath, []byte(sessionContent), 0644); err != nil {
		t.Fatal(err)
	}

	return dir, sessionID
}

// captureStdout swaps os.Stdout for a pipe, runs fn, and returns everything
// written to stdout. Commands write directly to os.Stdout, so this observes
// exactly what a user would see on the stdout stream.
func captureStdout(t *testing.T, fn func()) string {
	t.Helper()
	old := os.Stdout
	r, w, err := os.Pipe()
	if err != nil {
		t.Fatal(err)
	}
	os.Stdout = w

	done := make(chan string, 1)
	go func() {
		data, _ := io.ReadAll(r)
		done <- string(data)
	}()

	fn()

	_ = w.Close()
	os.Stdout = old
	return <-done
}

func TestJSONOutputIsPureJSON(t *testing.T) {
	dir, sessionID := writeJSONFixture(t)
	sessionPath := filepath.Join(dir, "projects", claude.EncodeProjectPath("/Users/test/jsonproject"), sessionID+".jsonl")
	lvl := "warn"

	cases := []struct {
		name string
		cmd  func() *cobra.Command
		args []string
	}{
		{"sessions", func() *cobra.Command { return sessionsCmd(&dir, &lvl) }, []string{"--json"}},
		{"stats", func() *cobra.Command { return statsCmd(&dir, &lvl) }, []string{"--json"}},
		{"search", func() *cobra.Command { return searchCmd(&dir, &lvl) }, []string{"--json", "database migration"}},
		{"inspect-id", func() *cobra.Command { return inspectCmd(&dir, &lvl) }, []string{"--json", sessionID}},
		{"inspect-file", func() *cobra.Command { return inspectCmd(&dir, &lvl) }, []string{"--json", sessionPath}},
		{"show", func() *cobra.Command { return showCmd(&dir, &lvl) }, []string{"--json", sessionID}},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			cmd := tc.cmd()
			cmd.SetArgs(tc.args)

			out := captureStdout(t, func() {
				if err := cmd.Execute(); err != nil {
					t.Fatalf("command failed: %v", err)
				}
			})

			if strings.TrimSpace(out) == "" {
				t.Fatal("stdout was empty; expected a JSON document")
			}

			// json.Unmarshal accepts exactly one JSON value followed only by
			// whitespace. Any log line, banner, or trailing text makes it fail —
			// which is precisely the invariant we want to enforce.
			var v any
			if err := json.Unmarshal([]byte(out), &v); err != nil {
				t.Fatalf("stdout is not a single pure JSON document: %v\n--- stdout ---\n%s", err, out)
			}
		})
	}
}
