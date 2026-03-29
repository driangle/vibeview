package main

import (
	"bytes"
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/driangle/vibeview/internal/claude"
	"github.com/driangle/vibeview/internal/session"
)

func TestBuildStatsReport(t *testing.T) {
	sessions := []session.SessionMeta{
		{
			SessionID:    "sess-1",
			Timestamp:    1711000000000,
			MessageCount: 10,
			Model:        "claude-sonnet-4-20250514",
			DurationMs:   60000, // 1 minute
			Usage: session.UsageTotals{
				InputTokens:  500,
				OutputTokens: 200,
				CostUSD:      0.50,
			},
		},
		{
			SessionID:    "sess-2",
			Timestamp:    1711100000000,
			MessageCount: 20,
			Model:        "claude-sonnet-4-20250514",
			DurationMs:   120000, // 2 minutes
			Usage: session.UsageTotals{
				InputTokens:              1000,
				OutputTokens:             400,
				CacheCreationInputTokens: 50,
				CacheReadInputTokens:     30,
				CostUSD:                  1.00,
			},
		},
		{
			SessionID:    "sess-3",
			Timestamp:    1711200000000,
			MessageCount: 5,
			Model:        "claude-opus-4-20250514",
			DurationMs:   300000, // 5 minutes
			Usage: session.UsageTotals{
				InputTokens:  2000,
				OutputTokens: 800,
				CostUSD:      3.00,
			},
		},
	}

	r := buildStatsReport(sessions)

	if r.TotalSessions != 3 {
		t.Errorf("TotalSessions = %d, want 3", r.TotalSessions)
	}
	if r.TotalMessages != 35 {
		t.Errorf("TotalMessages = %d, want 35", r.TotalMessages)
	}
	if r.TotalCostUSD == nil || *r.TotalCostUSD != 4.50 {
		t.Errorf("TotalCostUSD = %v, want 4.50", r.TotalCostUSD)
	}
	if r.InputTokens != 3500 {
		t.Errorf("InputTokens = %d, want 3500", r.InputTokens)
	}
	if r.OutputTokens != 1400 {
		t.Errorf("OutputTokens = %d, want 1400", r.OutputTokens)
	}
	if r.CacheTokens != 80 {
		t.Errorf("CacheTokens = %d, want 80", r.CacheTokens)
	}
	if r.TotalTokens != 4980 {
		t.Errorf("TotalTokens = %d, want 4980", r.TotalTokens)
	}
	if r.DateRange == nil {
		t.Fatal("expected DateRange to be set")
	}
	if r.AvgSessionDuration != "2m40s" {
		t.Errorf("AvgSessionDuration = %q, want %q", r.AvgSessionDuration, "2m40s")
	}
	// avg cost = 4.50 / 3 = 1.50
	if r.AvgSessionCostUSD == nil || *r.AvgSessionCostUSD != 1.50 {
		t.Errorf("AvgSessionCostUSD = %v, want 1.50", r.AvgSessionCostUSD)
	}
}

func TestBuildStatsReport_Empty(t *testing.T) {
	r := buildStatsReport(nil)
	if r.TotalSessions != 0 {
		t.Errorf("TotalSessions = %d, want 0", r.TotalSessions)
	}
	if r.DateRange != nil {
		t.Error("expected nil DateRange for empty sessions")
	}
	if len(r.Models) != 0 {
		t.Errorf("expected no models, got %d", len(r.Models))
	}
}

func TestBuildStatsReport_MultipleModels(t *testing.T) {
	sessions := []session.SessionMeta{
		{SessionID: "s1", Model: "claude-sonnet-4-20250514", MessageCount: 5, Usage: session.UsageTotals{CostUSD: 0.50}},
		{SessionID: "s2", Model: "claude-sonnet-4-20250514", MessageCount: 3, Usage: session.UsageTotals{CostUSD: 0.30}},
		{SessionID: "s3", Model: "claude-opus-4-20250514", MessageCount: 10, Usage: session.UsageTotals{CostUSD: 5.00}},
		{SessionID: "s4", Model: "", MessageCount: 2},
	}

	r := buildStatsReport(sessions)

	if len(r.Models) != 3 {
		t.Fatalf("expected 3 model groups, got %d", len(r.Models))
	}
	// Sorted by session count desc: sonnet (2), opus (1), unknown (1).
	if r.Models[0].Model != "claude-sonnet-4-20250514" || r.Models[0].Sessions != 2 {
		t.Errorf("first model = %q sessions=%d, want sonnet with 2", r.Models[0].Model, r.Models[0].Sessions)
	}
	if r.Models[0].CostUSD == nil || *r.Models[0].CostUSD != 0.80 {
		t.Errorf("sonnet cost = %v, want 0.80", r.Models[0].CostUSD)
	}
}

func TestRenderStatsStyled(t *testing.T) {
	// Disable colors for predictable output.
	colorEnabled = false
	defer func() { colorEnabled = detectColor() }()

	r := buildStatsReport([]session.SessionMeta{
		{
			SessionID:    "s1",
			Timestamp:    1711000000000,
			MessageCount: 10,
			Model:        "claude-sonnet-4-20250514",
			DurationMs:   60000,
			Usage: session.UsageTotals{
				InputTokens:  500,
				OutputTokens: 200,
				CostUSD:      1.00,
			},
		},
	})

	var buf bytes.Buffer
	renderStatsStyled(&buf, r)
	output := buf.String()

	for _, want := range []string{"Summary", "Sessions", "Messages", "Cost", "Tokens", "Models", "Averages"} {
		if !strings.Contains(output, want) {
			t.Errorf("output missing %q", want)
		}
	}
}

func TestStatsE2E(t *testing.T) {
	dir := t.TempDir()
	sessionID := "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"
	project := "/Users/test/statsproject"

	historyLine, _ := json.Marshal(map[string]any{
		"sessionId": sessionID,
		"project":   project,
		"display":   "stats test",
		"timestamp": 1711000000000,
	})
	if err := os.WriteFile(filepath.Join(dir, "history.jsonl"), historyLine, 0644); err != nil {
		t.Fatal(err)
	}

	encoded := claude.EncodeProjectPath(project)
	projectDir := filepath.Join(dir, "projects", encoded)
	if err := os.MkdirAll(projectDir, 0755); err != nil {
		t.Fatal(err)
	}

	sessionContent := strings.Join([]string{
		`{"type":"user","uuid":"u1","sessionId":"` + sessionID + `","timestamp":1711000000000,"message":{"role":"user","content":[{"type":"text","text":"help me with stats"}]}}`,
		`{"type":"assistant","uuid":"a1","sessionId":"` + sessionID + `","timestamp":1711000060000,"message":{"role":"assistant","model":"claude-sonnet-4-20250514","content":[{"type":"text","text":"Sure!"}],"usage":{"input_tokens":100,"output_tokens":50}}}`,
		`{"type":"result","uuid":"r1","sessionId":"` + sessionID + `","timestamp":1711000120000,"total_cost_usd":0.25}`,
	}, "\n")
	if err := os.WriteFile(filepath.Join(projectDir, sessionID+".jsonl"), []byte(sessionContent), 0644); err != nil {
		t.Fatal(err)
	}

	idx, err := discoverAndEnrich(dir, nil)
	if err != nil {
		t.Fatalf("discover failed: %v", err)
	}

	report := buildStatsReport(idx.GetSessions())

	if report.TotalSessions != 1 {
		t.Errorf("TotalSessions = %d, want 1", report.TotalSessions)
	}
	if report.TotalMessages != 3 {
		t.Errorf("TotalMessages = %d, want 3", report.TotalMessages)
	}
	if report.TotalCostUSD == nil || *report.TotalCostUSD != 0.25 {
		t.Errorf("TotalCostUSD = %v, want 0.25", report.TotalCostUSD)
	}
	if report.InputTokens != 100 {
		t.Errorf("InputTokens = %d, want 100", report.InputTokens)
	}
	if report.OutputTokens != 50 {
		t.Errorf("OutputTokens = %d, want 50", report.OutputTokens)
	}
	if len(report.Models) != 1 || report.Models[0].Model != "claude-sonnet-4-20250514" {
		t.Errorf("unexpected models: %+v", report.Models)
	}
	if report.DateRange == nil {
		t.Error("expected DateRange to be set")
	}
}
