package main

import (
	"bytes"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

const exportSession = `{"type":"user","uuid":"u1","sessionId":"877fff1e-80c9-4d20-a600-f278eb2c7bdc","timestamp":1700000000000,"message":{"role":"user","content":[{"type":"text","text":"hello world"}]}}
{"type":"assistant","uuid":"a1","sessionId":"877fff1e-80c9-4d20-a600-f278eb2c7bdc","timestamp":1700000001000,"message":{"role":"assistant","model":"claude-sonnet-4-20250514","content":[{"type":"text","text":"Hi there!"}],"usage":{"input_tokens":10,"output_tokens":5}}}
`

// setupExportDir writes a claude directory holding one session and returns its path.
func setupExportDir(t *testing.T) string {
	t.Helper()
	claudeDir := t.TempDir()

	history := `{"sessionId":"877fff1e-80c9-4d20-a600-f278eb2c7bdc","project":"/users/me/project","display":"Session","timestamp":1700000000000}
`
	if err := os.WriteFile(filepath.Join(claudeDir, "history.jsonl"), []byte(history), 0o644); err != nil {
		t.Fatal(err)
	}

	projectDir := filepath.Join(claudeDir, "projects", "-users-me-project")
	if err := os.MkdirAll(projectDir, 0o755); err != nil {
		t.Fatal(err)
	}
	sessionPath := filepath.Join(projectDir, "877fff1e-80c9-4d20-a600-f278eb2c7bdc.jsonl")
	if err := os.WriteFile(sessionPath, []byte(exportSession), 0o644); err != nil {
		t.Fatal(err)
	}
	return claudeDir
}

// runExport executes the export command and returns its combined output.
func runExport(t *testing.T, claudeDir string, args ...string) (string, error) {
	t.Helper()
	logLevel := "error"
	cmd := exportCmd(&claudeDir, &logLevel)
	var out bytes.Buffer
	cmd.SetOut(&out)
	cmd.SetErr(&out)
	cmd.SetArgs(args)
	err := cmd.Execute()
	return out.String(), err
}

func TestExportWritesPageForSessionPrefix(t *testing.T) {
	claudeDir := setupExportDir(t)
	outPath := filepath.Join(t.TempDir(), "page.html")

	if _, err := runExport(t, claudeDir, "877fff1e", "--out", outPath); err != nil {
		t.Fatalf("export failed: %v", err)
	}

	page, err := os.ReadFile(outPath)
	if err != nil {
		t.Fatalf("reading exported page: %v", err)
	}
	if !strings.HasPrefix(string(page), "<!doctype html>") {
		t.Error("exported file is not an HTML document")
	}
	if !strings.Contains(string(page), "877fff1e-80c9-4d20-a600-f278eb2c7bdc") {
		t.Error("exported page does not reference the session")
	}
}

func TestExportAcceptsSessionFilePath(t *testing.T) {
	sessionPath := filepath.Join(t.TempDir(), "877fff1e-80c9-4d20-a600-f278eb2c7bdc.jsonl")
	if err := os.WriteFile(sessionPath, []byte(exportSession), 0o644); err != nil {
		t.Fatal(err)
	}
	outPath := filepath.Join(t.TempDir(), "page.html")

	// A standalone file lives outside the claude directory entirely.
	if _, err := runExport(t, t.TempDir(), sessionPath, "--out", outPath); err != nil {
		t.Fatalf("export failed: %v", err)
	}

	if _, err := os.Stat(outPath); err != nil {
		t.Fatalf("expected an exported page: %v", err)
	}
}

func TestExportRejectsUnknownSession(t *testing.T) {
	claudeDir := setupExportDir(t)

	_, err := runExport(t, claudeDir, "nope-not-a-session", "--out", filepath.Join(t.TempDir(), "page.html"))
	if err == nil {
		t.Fatal("export succeeded for an unknown session")
	}
}

func TestExportRejectsUnsupportedFormat(t *testing.T) {
	claudeDir := setupExportDir(t)

	_, err := runExport(t, claudeDir, "877fff1e", "--format", "md")
	if err == nil {
		t.Fatal("export accepted an unimplemented format")
	}
	if !strings.Contains(err.Error(), "html") {
		t.Errorf("error should name the supported formats, got: %v", err)
	}
}
