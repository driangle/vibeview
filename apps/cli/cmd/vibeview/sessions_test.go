package main

import (
	"bytes"
	"encoding/json"
	"testing"

	"github.com/driangle/vibeview/internal/session"
)

func testSessions() []session.SessionMeta {
	return []session.SessionMeta{
		{
			SessionID:    "aaaa-1111-2222-3333",
			Project:      "/home/user/project-alpha",
			CustomTitle:  "Fix login bug",
			Timestamp:    1710000000000,
			MessageCount: 42,
			Model:        "claude-sonnet-4-5-20250514",
			Slug:         "help me fix the login",
			Usage:        session.UsageTotals{CostUSD: 1.50},
		},
		{
			SessionID:    "bbbb-4444-5555-6666",
			Project:      "/home/user/project-beta",
			Timestamp:    1710100000000,
			MessageCount: 10,
			Model:        "claude-sonnet-4-5-20250514",
			Slug:         "add new feature",
			Usage:        session.UsageTotals{CostUSD: 0.30},
		},
		{
			SessionID:    "cccc-7777-8888-9999",
			Project:      "/home/user/project-alpha",
			CustomTitle:  "Refactor auth",
			Timestamp:    1710200000000,
			MessageCount: 100,
			Model:        "claude-opus-4-20250514",
			Slug:         "refactor the auth module",
			Usage:        session.UsageTotals{CostUSD: 5.00},
		},
	}
}

func TestRenderSessionsTable(t *testing.T) {
	colorEnabled = false

	sessions := testSessions()
	// Capture stderr is tricky, so just verify it doesn't panic.
	renderSessionsTable(sessions, 3, 0)
}

func TestSortSessions_Timestamp(t *testing.T) {
	sessions := testSessions()
	sortSessions(sessions, "timestamp")

	// Descending: most recent first.
	if sessions[0].SessionID != "cccc-7777-8888-9999" {
		t.Errorf("expected most recent session first, got %s", sessions[0].SessionID)
	}
	if sessions[2].SessionID != "aaaa-1111-2222-3333" {
		t.Errorf("expected oldest session last, got %s", sessions[2].SessionID)
	}
}

func TestSortSessions_Cost(t *testing.T) {
	sessions := testSessions()
	sortSessions(sessions, "cost")

	if sessions[0].Usage.CostUSD != 5.00 {
		t.Errorf("expected highest cost first, got %.2f", sessions[0].Usage.CostUSD)
	}
	if sessions[2].Usage.CostUSD != 0.30 {
		t.Errorf("expected lowest cost last, got %.2f", sessions[2].Usage.CostUSD)
	}
}

func TestSortSessions_Messages(t *testing.T) {
	sessions := testSessions()
	sortSessions(sessions, "messages")

	if sessions[0].MessageCount != 100 {
		t.Errorf("expected most messages first, got %d", sessions[0].MessageCount)
	}
}

func TestSortSessions_Model(t *testing.T) {
	sessions := testSessions()
	sortSessions(sessions, "model")

	// Ascending alphabetical.
	if sessions[0].Model != "claude-opus-4-20250514" {
		t.Errorf("expected claude-opus first alphabetically, got %s", sessions[0].Model)
	}
}

func TestSortSessions_Dir(t *testing.T) {
	sessions := testSessions()
	sortSessions(sessions, "dir")

	if sessions[0].Project != "/home/user/project-alpha" {
		t.Errorf("expected project-alpha first, got %s", sessions[0].Project)
	}
}

func TestToSessionEntry(t *testing.T) {
	s := testSessions()[0]
	entry := toSessionEntry(s)

	if entry.ID != "aaaa-1111-2222-3333" {
		t.Errorf("expected session ID, got %s", entry.ID)
	}
	if entry.Title != "Fix login bug" {
		t.Errorf("expected custom title, got %s", entry.Title)
	}
	if entry.Dir != "/home/user/project-alpha" {
		t.Errorf("expected project dir, got %s", entry.Dir)
	}
	if entry.CostUSD != 1.50 {
		t.Errorf("expected cost 1.50, got %.2f", entry.CostUSD)
	}
	if entry.Timestamp == "" {
		t.Error("expected non-empty timestamp")
	}
}

func TestToSessionEntry_FallsBackToSlug(t *testing.T) {
	s := testSessions()[1] // no custom title
	entry := toSessionEntry(s)

	if entry.Title != "add new feature" {
		t.Errorf("expected slug as title fallback, got %s", entry.Title)
	}
}

func TestSessionsJSON_Marshal(t *testing.T) {
	sessions := testSessions()
	entries := make([]sessionEntry, len(sessions))
	for i, s := range sessions {
		entries[i] = toSessionEntry(s)
	}

	out := sessionsJSON{
		Sessions: entries,
		Total:    3,
		Limit:    25,
		Offset:   0,
	}

	var buf bytes.Buffer
	enc := json.NewEncoder(&buf)
	enc.SetIndent("", "  ")
	if err := enc.Encode(out); err != nil {
		t.Fatalf("failed to encode JSON: %v", err)
	}

	var decoded sessionsJSON
	if err := json.Unmarshal(buf.Bytes(), &decoded); err != nil {
		t.Fatalf("failed to decode JSON: %v", err)
	}

	if decoded.Total != 3 {
		t.Errorf("expected total 3, got %d", decoded.Total)
	}
	if len(decoded.Sessions) != 3 {
		t.Errorf("expected 3 sessions, got %d", len(decoded.Sessions))
	}
	if decoded.Sessions[0].ID != "aaaa-1111-2222-3333" {
		t.Errorf("expected first session ID, got %s", decoded.Sessions[0].ID)
	}
}

func TestTruncateStr(t *testing.T) {
	tests := []struct {
		input  string
		maxLen int
		want   string
	}{
		{"short", 10, "short"},
		{"exactly ten", 11, "exactly ten"},
		{"a longer string here", 10, "a longe..."},
		{"ab", 2, "ab"},
		{"abc", 2, "ab"},
	}

	for _, tt := range tests {
		got := truncateStr(tt.input, tt.maxLen)
		if got != tt.want {
			t.Errorf("truncateStr(%q, %d) = %q, want %q", tt.input, tt.maxLen, got, tt.want)
		}
	}
}

func TestPaginateSessions(t *testing.T) {
	sessions := testSessions()
	sortSessions(sessions, "timestamp")

	// Offset 1, limit 1 should give the middle session.
	paginated := paginateSessions(sessions, 1, 1)

	if len(paginated) != 1 {
		t.Fatalf("expected 1 session, got %d", len(paginated))
	}
	// After timestamp sort (desc): cccc, bbbb, aaaa — offset 1 = bbbb.
	if paginated[0].SessionID != "bbbb-4444-5555-6666" {
		t.Errorf("expected bbbb session at offset 1, got %s", paginated[0].SessionID)
	}
}

func TestPaginateSessions_OffsetBeyondLength(t *testing.T) {
	sessions := testSessions()
	paginated := paginateSessions(sessions, 100, 25)

	if len(paginated) != 0 {
		t.Errorf("expected empty result for offset beyond length, got %d", len(paginated))
	}
}

func TestSortNeedsEnrichment(t *testing.T) {
	tests := []struct {
		field string
		want  bool
	}{
		{"timestamp", false},
		{"dir", false},
		{"cost", true},
		{"messages", true},
		{"model", true},
	}
	for _, tt := range tests {
		got := sortNeedsEnrichment(tt.field)
		if got != tt.want {
			t.Errorf("sortNeedsEnrichment(%q) = %v, want %v", tt.field, got, tt.want)
		}
	}
}
