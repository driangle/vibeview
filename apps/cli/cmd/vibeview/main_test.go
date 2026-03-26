package main

import (
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/driangle/vibeview/internal/claude"
)

// --- Builder unit tests ---

func TestBuildMessageReport(t *testing.T) {
	messages := []claude.Message{
		{Type: claude.MessageTypeUser, Timestamp: 1711000000000},
		{Type: claude.MessageTypeAssistant, Timestamp: 1711000005000, Message: &claude.APIMessage{
			Model: "claude-sonnet-4-20250514",
			Usage: &claude.Usage{InputTokens: 100, OutputTokens: 50},
		}},
		{Type: claude.MessageTypeAssistant, Timestamp: 1711000010000, Message: &claude.APIMessage{
			Model: "claude-sonnet-4-20250514",
			Usage: &claude.Usage{InputTokens: 200, OutputTokens: 80},
		}},
		{Type: claude.MessageTypeProgress, Timestamp: 1711000007000},
	}

	r := buildMessageReport(messages)

	if r.Total != 4 {
		t.Errorf("Total = %d, want 4", r.Total)
	}
	if r.ByType["user"] != 1 {
		t.Errorf("ByType[user] = %d, want 1", r.ByType["user"])
	}
	if r.ByType["assistant"] != 2 {
		t.Errorf("ByType[assistant] = %d, want 2", r.ByType["assistant"])
	}
	if r.Model != "claude-sonnet-4-20250514" {
		t.Errorf("Model = %q, want %q", r.Model, "claude-sonnet-4-20250514")
	}
	if r.Duration != "10s" {
		t.Errorf("Duration = %q, want %q", r.Duration, "10s")
	}
	if r.First == "" || r.Last == "" {
		t.Error("expected First and Last to be set")
	}
}

func TestBuildMessageReport_Empty(t *testing.T) {
	r := buildMessageReport(nil)
	if r.Total != 0 {
		t.Errorf("Total = %d, want 0", r.Total)
	}
	if r.First != "" || r.Last != "" || r.Duration != "" {
		t.Error("expected empty timestamps for nil messages")
	}
}

func TestBuildUsageReport(t *testing.T) {
	messages := []claude.Message{
		{Type: claude.MessageTypeUser},
		{Type: claude.MessageTypeAssistant, Message: &claude.APIMessage{
			Model: "claude-sonnet-4-20250514",
			Usage: &claude.Usage{
				InputTokens:              100,
				OutputTokens:             50,
				CacheCreationInputTokens: 10,
				CacheReadInputTokens:     20,
			},
		}},
		{Type: claude.MessageTypeAssistant, Message: &claude.APIMessage{
			Model: "claude-sonnet-4-20250514",
			Usage: &claude.Usage{
				InputTokens:  200,
				OutputTokens: 80,
			},
		}},
		// No usage — should be skipped.
		{Type: claude.MessageTypeAssistant, Message: &claude.APIMessage{Model: "claude-sonnet-4-20250514"}},
	}

	u := buildUsageReport(messages)

	if u.InputTokens != 300 {
		t.Errorf("InputTokens = %d, want 300", u.InputTokens)
	}
	if u.OutputTokens != 130 {
		t.Errorf("OutputTokens = %d, want 130", u.OutputTokens)
	}
	if u.CacheCreationTokens != 10 {
		t.Errorf("CacheCreationTokens = %d, want 10", u.CacheCreationTokens)
	}
	if u.CacheReadTokens != 20 {
		t.Errorf("CacheReadTokens = %d, want 20", u.CacheReadTokens)
	}
	if u.TotalTokens != 460 {
		t.Errorf("TotalTokens = %d, want 460", u.TotalTokens)
	}
	if u.Cost <= 0 {
		t.Error("expected positive cost")
	}
}

func TestBuildUsageReport_Empty(t *testing.T) {
	u := buildUsageReport(nil)
	if u.TotalTokens != 0 || u.Cost != 0 {
		t.Errorf("expected zero usage for nil messages, got tokens=%d cost=%f", u.TotalTokens, u.Cost)
	}
}

func TestBuildInsightsReport(t *testing.T) {
	fixture := filepath.Join("..", "..", "testdata", "fixtures", "session_with_tools.jsonl")
	f, err := os.Open(fixture)
	if err != nil {
		t.Fatalf("cannot open fixture: %v", err)
	}
	defer f.Close()

	messages, _, err := claude.ParseSessionFile(f)
	if err != nil {
		t.Fatalf("parse error: %v", err)
	}

	r := buildInsightsReport(messages)

	if len(r.Tools) == 0 {
		t.Error("expected tools to be non-empty")
	}
	if len(r.FilesWritten) == 0 {
		t.Error("expected files_written > 0")
	}
	if r.FilesRead == 0 {
		t.Error("expected files_read > 0")
	}
	if r.BashCommands == 0 {
		t.Error("expected bash_commands > 0")
	}
	if len(r.Errors) == 0 {
		t.Error("expected errors to be non-empty")
	}
	if len(r.Skills) == 0 {
		t.Error("expected skills to be non-empty")
	}
}

// --- Inspect file e2e ---

func TestBuildFileReport(t *testing.T) {
	fixture := filepath.Join("..", "..", "testdata", "fixtures", "session_with_tools.jsonl")
	r := buildFileReport(fixture)

	if r.Size == 0 {
		t.Error("expected non-zero file size")
	}
	if r.Modified == "" {
		t.Error("expected modified timestamp")
	}
	if r.Messages == nil {
		t.Fatal("expected messages report")
	}
	if r.Messages.Total != 10 {
		t.Errorf("Messages.Total = %d, want 10", r.Messages.Total)
	}
	if r.Usage == nil {
		t.Fatal("expected usage report")
	}
	if r.Insights == nil {
		t.Fatal("expected insights report")
	}
	if r.Parse != nil {
		t.Error("expected no parse errors for clean fixture")
	}
}

func TestBuildFileReport_WithParseErrors(t *testing.T) {
	fixture := filepath.Join("..", "..", "testdata", "fixtures", "session_edge_cases.jsonl")
	r := buildFileReport(fixture)

	// Should still produce a report even with malformed lines.
	if r.Messages == nil {
		t.Fatal("expected messages report even with parse errors")
	}
}

// --- Inspect directory e2e ---

func TestBuildDirectoryReport(t *testing.T) {
	dir := filepath.Join("..", "..", "testdata", "fixtures")
	r := buildDirectoryReport(dir)

	if r == nil {
		t.Fatal("expected non-nil directory report")
	}
	if len(r.Sessions) < 2 {
		t.Errorf("expected at least 2 sessions in fixtures dir, got %d", len(r.Sessions))
	}
	for _, s := range r.Sessions {
		if s.Messages == nil {
			t.Errorf("session %s missing messages report", s.Path)
		}
	}
}

// --- Lookup with synthetic claude dir ---

func TestBuildLookupReport_InvalidID(t *testing.T) {
	r := buildLookupReport(t.TempDir(), "../escape")
	if r.Valid {
		t.Error("expected invalid for path traversal ID")
	}
	if len(r.Problems) == 0 {
		t.Error("expected problems for invalid ID")
	}
}

func TestBuildLookupReport_NotInHistory(t *testing.T) {
	dir := t.TempDir()
	// Create empty history.
	os.WriteFile(filepath.Join(dir, "history.jsonl"), []byte(""), 0644)

	r := buildLookupReport(dir, "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee")
	if !r.Valid {
		t.Error("expected valid session ID")
	}
	if r.HistoryHits != 0 {
		t.Errorf("HistoryHits = %d, want 0", r.HistoryHits)
	}
	if len(r.Problems) == 0 || !strings.Contains(r.Problems[0], "not found in history") {
		t.Errorf("expected 'not found' problem, got %v", r.Problems)
	}
}

func TestBuildLookupReport_FullPipeline(t *testing.T) {
	dir := t.TempDir()
	sessionID := "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"
	project := "/Users/test/myproject"

	// Create history entry.
	historyLine, _ := json.Marshal(map[string]any{
		"sessionId": sessionID,
		"project":   project,
		"display":   "test session",
		"timestamp": 1711000000000,
	})
	os.WriteFile(filepath.Join(dir, "history.jsonl"), historyLine, 0644)

	// Create encoded project dir and session file.
	encoded := claude.EncodeProjectPath(project)
	projectDir := filepath.Join(dir, "projects", encoded)
	os.MkdirAll(projectDir, 0755)

	sessionContent := strings.Join([]string{
		`{"type":"user","uuid":"u1","sessionId":"` + sessionID + `","timestamp":1711000000000,"message":{"role":"user","content":[{"type":"text","text":"hello world"}]}}`,
		`{"type":"assistant","uuid":"a1","sessionId":"` + sessionID + `","timestamp":1711000001000,"message":{"role":"assistant","model":"claude-sonnet-4-20250514","content":[{"type":"text","text":"hi"}],"usage":{"input_tokens":100,"output_tokens":50}}}`,
	}, "\n")
	os.WriteFile(filepath.Join(projectDir, sessionID+".jsonl"), []byte(sessionContent), 0644)

	r := buildLookupReport(dir, sessionID)

	if !r.Valid {
		t.Error("expected valid")
	}
	if r.HistoryHits != 1 {
		t.Errorf("HistoryHits = %d, want 1", r.HistoryHits)
	}
	if r.Project != project {
		t.Errorf("Project = %q, want %q", r.Project, project)
	}
	if r.Resolution == nil {
		t.Fatal("expected resolution report")
	}
	if !r.Resolution.DirExists {
		t.Error("expected dir to exist")
	}
	if !r.Resolution.FileExists {
		t.Error("expected file to exist")
	}
	if r.Enrichment == nil || !r.Enrichment.Success {
		t.Error("expected successful enrichment")
	}
	if r.Enrichment.Messages != 2 {
		t.Errorf("Enrichment.Messages = %d, want 2", r.Enrichment.Messages)
	}
	if r.Usage == nil {
		t.Fatal("expected usage report")
	}
	if r.Usage.InputTokens != 100 || r.Usage.OutputTokens != 50 {
		t.Errorf("unexpected usage: input=%d output=%d", r.Usage.InputTokens, r.Usage.OutputTokens)
	}
	if r.Messages == nil {
		t.Fatal("expected messages report")
	}
	if r.Insights == nil {
		t.Fatal("expected insights report")
	}
	if len(r.Problems) != 0 {
		t.Errorf("unexpected problems: %v", r.Problems)
	}
}

func TestBuildLookupReport_MissingDir(t *testing.T) {
	dir := t.TempDir()
	sessionID := "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"

	historyLine, _ := json.Marshal(map[string]any{
		"sessionId": sessionID,
		"project":   "/Users/test/missing",
		"display":   "test",
		"timestamp": 1711000000000,
	})
	os.WriteFile(filepath.Join(dir, "history.jsonl"), historyLine, 0644)
	os.MkdirAll(filepath.Join(dir, "projects"), 0755)

	r := buildLookupReport(dir, sessionID)

	if r.Resolution == nil || r.Resolution.DirExists {
		t.Error("expected dir to not exist")
	}
	if len(r.Problems) == 0 {
		t.Error("expected problems about missing directory")
	}
}

// --- Search via synthetic claude dir ---

func TestSearchE2E(t *testing.T) {
	dir := t.TempDir()
	sessionID := "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"
	project := "/Users/test/searchproject"

	historyLine, _ := json.Marshal(map[string]any{
		"sessionId": sessionID,
		"project":   project,
		"display":   "search test",
		"timestamp": 1711000000000,
	})
	os.WriteFile(filepath.Join(dir, "history.jsonl"), historyLine, 0644)

	encoded := claude.EncodeProjectPath(project)
	projectDir := filepath.Join(dir, "projects", encoded)
	os.MkdirAll(projectDir, 0755)

	sessionContent := strings.Join([]string{
		`{"type":"user","uuid":"u1","sessionId":"` + sessionID + `","timestamp":1711000000000,"message":{"role":"user","content":[{"type":"text","text":"help me fix the database migration"}]}}`,
		`{"type":"assistant","uuid":"a1","sessionId":"` + sessionID + `","timestamp":1711000001000,"message":{"role":"assistant","model":"claude-sonnet-4-20250514","content":[{"type":"text","text":"I will help with the database migration issue."}],"usage":{"input_tokens":50,"output_tokens":30}}}`,
	}, "\n")
	os.WriteFile(filepath.Join(projectDir, sessionID+".jsonl"), []byte(sessionContent), 0644)

	// Build index the same way the search command does.
	idx, err := discoverAndEnrich(dir, nil)
	if err != nil {
		t.Fatalf("discover failed: %v", err)
	}

	results := doSearch(idx, dir, "database migration", 10)

	if results.Total == 0 {
		t.Fatal("expected at least 1 search result")
	}
	if results.Results[0].SessionID != sessionID {
		t.Errorf("SessionID = %q, want %q", results.Results[0].SessionID, sessionID)
	}
	if !strings.Contains(results.Results[0].Snippet, "database migration") {
		t.Errorf("snippet %q should contain 'database migration'", results.Results[0].Snippet)
	}
}

func TestSearchE2E_NoResults(t *testing.T) {
	dir := t.TempDir()
	sessionID := "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"
	project := "/Users/test/emptyproject"

	historyLine, _ := json.Marshal(map[string]any{
		"sessionId": sessionID,
		"project":   project,
		"display":   "test",
		"timestamp": 1711000000000,
	})
	os.WriteFile(filepath.Join(dir, "history.jsonl"), historyLine, 0644)

	encoded := claude.EncodeProjectPath(project)
	projectDir := filepath.Join(dir, "projects", encoded)
	os.MkdirAll(projectDir, 0755)

	sessionContent := `{"type":"user","uuid":"u1","sessionId":"` + sessionID + `","timestamp":1711000000000,"message":{"role":"user","content":[{"type":"text","text":"hello"}]}}`
	os.WriteFile(filepath.Join(projectDir, sessionID+".jsonl"), []byte(sessionContent), 0644)

	idx, err := discoverAndEnrich(dir, nil)
	if err != nil {
		t.Fatalf("discover failed: %v", err)
	}

	results := doSearch(idx, dir, "xyznonexistent", 10)
	if results.Total != 0 {
		t.Errorf("Total = %d, want 0", results.Total)
	}
}
