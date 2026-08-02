package main

import (
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/driangle/vibeview/apps/lib/claude"
)

// writeTestSession writes a history entry and a session JSONL file for sessionID
// under claudeDir, using marker as the first user message text so callers can
// identify which session resolved.
func writeTestSession(t *testing.T, claudeDir, sessionID, project, marker string) {
	t.Helper()

	historyLine, _ := json.Marshal(map[string]any{
		"sessionId": sessionID,
		"project":   project,
		"display":   marker,
		"timestamp": 1711000000000,
	})
	historyPath := filepath.Join(claudeDir, "history.jsonl")
	f, err := os.OpenFile(historyPath, os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0644)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := f.Write(append(historyLine, '\n')); err != nil {
		t.Fatal(err)
	}
	f.Close()

	encoded := claude.EncodeProjectPath(project)
	projectDir := filepath.Join(claudeDir, "projects", encoded)
	if err := os.MkdirAll(projectDir, 0755); err != nil {
		t.Fatal(err)
	}
	content := `{"type":"user","uuid":"u1","sessionId":"` + sessionID + `","timestamp":1711000000000,"message":{"role":"user","content":[{"type":"text","text":"` + marker + `"}]}}`
	if err := os.WriteFile(filepath.Join(projectDir, sessionID+".jsonl"), []byte(content), 0644); err != nil {
		t.Fatal(err)
	}
}

// firstUserText returns the text of the first user message, used to identify a session.
func firstUserText(msgs []claude.Message) string {
	for _, m := range msgs {
		if m.Type == claude.MessageTypeUser && m.Message != nil {
			for _, b := range m.Message.Content {
				if b.Type == "text" {
					return b.Text
				}
			}
		}
	}
	return ""
}

// TestResolveParity_Prefix verifies that `inspect` and `show` resolve the same
// session from an 8-char prefix, and that `inspect` also accepts the full UUID.
func TestResolveParity_Prefix(t *testing.T) {
	dir := t.TempDir()
	sessionID := "df9336c1-aaaa-bbbb-cccc-dddddddddddd"
	writeTestSession(t, dir, sessionID, "/Users/test/proj", "marker-alpha")

	const prefix = "df9336c1"

	// show resolves the prefix to the session's messages.
	msgs, err := resolveSessionMessages(dir, prefix)
	if err != nil {
		t.Fatalf("show resolveSessionMessages(%q) error: %v", prefix, err)
	}
	if got := firstUserText(msgs); got != "marker-alpha" {
		t.Fatalf("show resolved wrong session: first text = %q", got)
	}

	// inspect resolves the same prefix to the same session.
	r := buildLookupReport(dir, prefix)
	if len(r.Problems) != 0 {
		t.Fatalf("inspect prefix lookup problems: %v", r.Problems)
	}
	if r.SessionID != sessionID {
		t.Errorf("inspect SessionID = %q, want canonical %q", r.SessionID, sessionID)
	}
	if r.Enrichment == nil || !r.Enrichment.Success {
		t.Error("expected successful enrichment for prefix lookup")
	}

	// inspect also accepts the full UUID.
	rFull := buildLookupReport(dir, sessionID)
	if len(rFull.Problems) != 0 {
		t.Fatalf("inspect full-UUID lookup problems: %v", rFull.Problems)
	}
	if rFull.SessionID != sessionID {
		t.Errorf("inspect full-UUID SessionID = %q, want %q", rFull.SessionID, sessionID)
	}
}

// TestResolveParity_AmbiguousPrefix verifies that an ambiguous prefix yields a
// consistent error between `inspect` and `show`.
func TestResolveParity_AmbiguousPrefix(t *testing.T) {
	dir := t.TempDir()
	writeTestSession(t, dir, "df9336c1-1111-1111-1111-111111111111", "/Users/test/proj", "one")
	writeTestSession(t, dir, "df9336c1-2222-2222-2222-222222222222", "/Users/test/proj", "two")

	const prefix = "df9336c1"

	_, showErr := resolveSessionMessages(dir, prefix)
	if showErr == nil || !strings.Contains(showErr.Error(), "ambiguous") {
		t.Fatalf("show ambiguous error = %v, want 'ambiguous'", showErr)
	}

	r := buildLookupReport(dir, prefix)
	if len(r.Problems) == 0 || !strings.Contains(r.Problems[0], "ambiguous") {
		t.Fatalf("inspect ambiguous problem = %v, want 'ambiguous'", r.Problems)
	}
	if r.Problems[0] != showErr.Error() {
		t.Errorf("inspect/show ambiguous errors differ:\n inspect: %q\n show:    %q", r.Problems[0], showErr.Error())
	}
}

// TestResolveParity_UnknownPrefix verifies that an unknown prefix yields a
// consistent error between `inspect` and `show`.
func TestResolveParity_UnknownPrefix(t *testing.T) {
	dir := t.TempDir()
	writeTestSession(t, dir, "df9336c1-aaaa-bbbb-cccc-dddddddddddd", "/Users/test/proj", "marker")

	const prefix = "0000ffff"

	_, showErr := resolveSessionMessages(dir, prefix)
	if showErr == nil || !strings.Contains(showErr.Error(), "no session matching") {
		t.Fatalf("show unknown error = %v, want 'no session matching'", showErr)
	}

	r := buildLookupReport(dir, prefix)
	if len(r.Problems) == 0 || r.Problems[0] != showErr.Error() {
		t.Errorf("inspect/show unknown errors differ:\n inspect: %v\n show:    %q", r.Problems, showErr.Error())
	}
}
