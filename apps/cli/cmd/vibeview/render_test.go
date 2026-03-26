package main

import (
	"bytes"
	"strings"
	"testing"
	"time"
)

// --- Formatting helpers ---

func TestFormatCommas(t *testing.T) {
	tests := []struct {
		in   int
		want string
	}{
		{0, "0"},
		{5, "5"},
		{999, "999"},
		{1000, "1,000"},
		{12345, "12,345"},
		{1234567, "1,234,567"},
		{-1234, "-1,234"},
	}
	for _, tt := range tests {
		if got := formatCommas(tt.in); got != tt.want {
			t.Errorf("formatCommas(%d) = %q, want %q", tt.in, got, tt.want)
		}
	}
}

func TestFormatCost(t *testing.T) {
	tests := []struct {
		in   float64
		want string
	}{
		{0, "$0.00"},
		{1.5, "$1.50"},
		{0.123, "$0.12"},
		{12.999, "$13.00"},
	}
	for _, tt := range tests {
		if got := formatCost(tt.in); got != tt.want {
			t.Errorf("formatCost(%f) = %q, want %q", tt.in, got, tt.want)
		}
	}
}

func TestRelativeTime(t *testing.T) {
	now := time.Now()

	tests := []struct {
		offset time.Duration
		want   string
	}{
		{30 * time.Second, "just now"},
		{5 * time.Minute, "5m ago"},
		{1 * time.Minute, "1m ago"},
		{3 * time.Hour, "3h ago"},
		{1 * time.Hour, "1h ago"},
		{2 * 24 * time.Hour, "2d ago"},
		{1 * 24 * time.Hour, "1d ago"},
	}
	for _, tt := range tests {
		ts := now.Add(-tt.offset).Format(time.RFC3339)
		got := relativeTime(ts)
		if got != tt.want {
			t.Errorf("relativeTime(%v ago) = %q, want %q", tt.offset, got, tt.want)
		}
	}

	if got := relativeTime("invalid"); got != "" {
		t.Errorf("relativeTime(invalid) = %q, want empty", got)
	}
}

func TestFormatFileSize(t *testing.T) {
	tests := []struct {
		in   int64
		want string
	}{
		{0, "0 B"},
		{512, "512 B"},
		{1024, "1.0 KB"},
		{1536, "1.5 KB"},
		{1048576, "1.0 MB"},
		{2621440, "2.5 MB"},
	}
	for _, tt := range tests {
		if got := formatFileSize(tt.in); got != tt.want {
			t.Errorf("formatFileSize(%d) = %q, want %q", tt.in, got, tt.want)
		}
	}
}

func TestStripANSI(t *testing.T) {
	tests := []struct {
		in   string
		want string
	}{
		{"hello", "hello"},
		{"\033[1mhello\033[0m", "hello"},
		{"\033[36mcolored\033[0m text", "colored text"},
	}
	for _, tt := range tests {
		if got := stripANSI(tt.in); got != tt.want {
			t.Errorf("stripANSI(%q) = %q, want %q", tt.in, got, tt.want)
		}
	}
}

// --- Section rendering ---

func TestRenderLookupStyled_FullReport(t *testing.T) {
	orig := colorEnabled
	colorEnabled = false
	defer func() { colorEnabled = orig }()

	var buf bytes.Buffer
	r := &lookupReport{
		SessionID:   "abc-123-def",
		Project:     "/Users/test/myproject",
		Timestamp:   time.Now().Add(-2 * time.Hour).Format(time.RFC3339),
		Valid:       true,
		HistoryHits: 1,
		Enrichment: &enrichmentReport{
			Success:  true,
			Messages: 42,
			Model:    "claude-sonnet-4-20250514",
			Slug:     "fix the auth bug",
			Activity: "idle",
		},
		Messages: &messageReport{
			Total:    42,
			ByType:   map[string]int{"user": 18, "assistant": 22, "progress": 2},
			First:    time.Now().Add(-2 * time.Hour).Format(time.RFC3339),
			Last:     time.Now().Add(-1 * time.Hour).Format(time.RFC3339),
			Duration: "1h0m0s",
		},
		Usage: &usageReport{
			InputTokens:         125430,
			OutputTokens:        34210,
			CacheCreationTokens: 50000,
			CacheReadTokens:     39000,
			TotalTokens:         248640,
			Cost:                1.23,
		},
		Insights: &insightsReport{
			Tools: []toolEntry{
				{Name: "Read", Count: 45},
				{Name: "Edit", Count: 12},
				{Name: "Bash", Count: 8},
			},
			Errors: []errorDetail{
				{ToolName: "Edit", Snippet: "file not found"},
				{ToolName: "Bash", Snippet: "command failed"},
			},
			FilesWritten: []string{"~/src/auth.go", "~/src/auth_test.go"},
			FilesRead:    23,
			Subagents: []subagentDetail{
				{Description: "Review test coverage", TurnCount: 4},
			},
			Skills: []toolEntry{
				{Name: "commit", Count: 3},
			},
		},
	}

	renderLookupStyled(&buf, r, false)
	out := buf.String()

	assertContains(t, out, "abc-123-def")
	assertContains(t, out, "fix the auth bug")
	assertContains(t, out, "claude-sonnet-4-20250514")
	assertContains(t, out, "idle")
	assertContains(t, out, "42 total")
	assertContains(t, out, "125,430")
	assertContains(t, out, "34,210")
	assertContains(t, out, "$1.23")
	assertContains(t, out, "Read")
	assertContains(t, out, "Edit")
	assertContains(t, out, "Bash")
	assertContains(t, out, "~/src/auth.go")
	assertContains(t, out, "~/src/auth_test.go")
	assertContains(t, out, "23 files")
	assertContains(t, out, "file not found")
	assertContains(t, out, "command failed")
	assertContains(t, out, "Review test coverage")
	assertContains(t, out, "4 turns")
	assertContains(t, out, "commit")
}

func TestRenderLookupStyled_EmptySectionsOmitted(t *testing.T) {
	orig := colorEnabled
	colorEnabled = false
	defer func() { colorEnabled = orig }()

	var buf bytes.Buffer
	r := &lookupReport{
		SessionID:   "abc-123",
		Valid:       true,
		HistoryHits: 1,
		Insights: &insightsReport{
			Tools: []toolEntry{{Name: "Read", Count: 5}},
		},
	}

	renderLookupStyled(&buf, r, false)
	out := buf.String()

	// "Errors (" is the errors section header; "Errors" alone appears in the tool table column.
	if strings.Contains(out, "Errors (") {
		t.Error("should not show Errors section when empty")
	}
	if strings.Contains(out, "Subagents") {
		t.Error("should not show Subagents section when empty")
	}
	if strings.Contains(out, "Skills") {
		t.Error("should not show Skills section when empty")
	}
	if strings.Contains(out, "Files") {
		t.Error("should not show Files section when empty")
	}
}

func TestRenderLookupStyled_VerboseSections(t *testing.T) {
	orig := colorEnabled
	colorEnabled = false
	defer func() { colorEnabled = orig }()

	var buf bytes.Buffer
	r := &lookupReport{
		SessionID:   "abc-123",
		Valid:       true,
		HistoryHits: 1,
		Resolution: &resolutionReport{
			EncodedPath: "encoded-path",
			ExpectedDir: "/home/test/.claude/projects/encoded-path",
			DirExists:   true,
			FileExists:  true,
			FilePath:    "/home/test/.claude/projects/encoded-path/abc-123.jsonl",
		},
		Enrichment: &enrichmentReport{
			Success:  true,
			Messages: 10,
			Model:    "claude-sonnet-4-20250514",
			Slug:     "test slug",
			Activity: "idle",
		},
	}

	renderLookupStyled(&buf, r, false)
	out := buf.String()
	if strings.Contains(out, "Resolution") {
		t.Error("should not show Resolution section without verbose")
	}
	if strings.Contains(out, "Enrichment") {
		t.Error("should not show Enrichment section without verbose")
	}

	buf.Reset()
	renderLookupStyled(&buf, r, true)
	out = buf.String()
	assertContains(t, out, "Resolution")
	assertContains(t, out, "encoded-path")
	assertContains(t, out, "Enrichment")
}

func TestRenderFileStyled(t *testing.T) {
	orig := colorEnabled
	colorEnabled = false
	defer func() { colorEnabled = orig }()

	var buf bytes.Buffer
	r := &fileReport{
		Path:     "/Users/test/session.jsonl",
		Size:     2048,
		Modified: time.Now().Add(-1 * time.Hour).Format(time.RFC3339),
		Messages: &messageReport{
			Total:    10,
			ByType:   map[string]int{"user": 4, "assistant": 6},
			Duration: "5m0s",
			Model:    "claude-sonnet-4-20250514",
		},
		Usage: &usageReport{
			InputTokens:  5000,
			OutputTokens: 2000,
			TotalTokens:  7000,
			Cost:         0.05,
		},
		Insights: &insightsReport{
			Tools: []toolEntry{{Name: "Read", Count: 3}},
		},
	}

	renderFileStyled(&buf, r, false)
	out := buf.String()

	assertContains(t, out, "File")
	assertContains(t, out, "2.0 KB")
	assertContains(t, out, "5m0s")
	assertContains(t, out, "5,000")
	assertContains(t, out, "$0.05")
}

func TestRenderDirectoryStyled(t *testing.T) {
	orig := colorEnabled
	colorEnabled = false
	defer func() { colorEnabled = orig }()

	var buf bytes.Buffer
	r := &directoryReport{
		Path: "/Users/test/sessions",
		Sessions: []fileReport{
			{
				Path: "/Users/test/sessions/a.jsonl",
				Messages: &messageReport{
					Total:    10,
					Duration: "5m0s",
				},
				Usage: &usageReport{Cost: 0.50},
			},
			{
				Path: "/Users/test/sessions/b.jsonl",
				Messages: &messageReport{
					Total:    20,
					Duration: "10m0s",
				},
				Usage: &usageReport{Cost: 1.00},
			},
		},
	}

	renderDirectoryStyled(&buf, r)
	out := buf.String()

	assertContains(t, out, "Directory")
	assertContains(t, out, "2")
	assertContains(t, out, "a.jsonl")
	assertContains(t, out, "b.jsonl")
	assertContains(t, out, "$0.50")
	assertContains(t, out, "$1.00")
}

func TestRenderStyled_Dispatch(t *testing.T) {
	orig := colorEnabled
	colorEnabled = false
	defer func() { colorEnabled = orig }()

	var buf bytes.Buffer

	renderStyled(&buf, inspectReport{Lookup: &lookupReport{SessionID: "test-id"}}, false)
	assertContains(t, buf.String(), "test-id")

	buf.Reset()
	renderStyled(&buf, inspectReport{File: &fileReport{Path: "/test/file.jsonl", Messages: &messageReport{}}}, false)
	assertContains(t, buf.String(), "File")

	buf.Reset()
	renderStyled(&buf, inspectReport{Directory: &directoryReport{Path: "/test/dir"}}, false)
	assertContains(t, buf.String(), "Directory")
}

func TestRenderProblemsShownWithoutVerbose(t *testing.T) {
	orig := colorEnabled
	colorEnabled = false
	defer func() { colorEnabled = orig }()

	var buf bytes.Buffer
	r := &lookupReport{
		SessionID: "abc-123",
		Problems:  []string{"session not found in history.jsonl"},
	}
	renderLookupStyled(&buf, r, false)
	assertContains(t, buf.String(), "session not found")
}

// --- Helpers ---

func assertContains(t *testing.T, haystack, needle string) {
	t.Helper()
	if !strings.Contains(haystack, needle) {
		t.Errorf("output should contain %q but does not.\nOutput:\n%s", needle, haystack)
	}
}
