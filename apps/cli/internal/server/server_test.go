package server

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/driangle/vibeview/internal/claude"
	"github.com/driangle/vibeview/internal/session"
)

// setupTestDir creates a temporary claude directory with history and session files.
func setupTestDir(t *testing.T) string {
	t.Helper()
	dir := t.TempDir()

	// Write history.jsonl with two sessions in different projects.
	history := `{"sessionId":"sess-1","project":"/users/me/project-a","display":"Session One","timestamp":1700000000000}
{"sessionId":"sess-2","project":"/users/me/project-b","display":"Session Two","timestamp":1700001000000}
`
	if err := os.WriteFile(filepath.Join(dir, "history.jsonl"), []byte(history), 0644); err != nil {
		t.Fatal(err)
	}

	// Create session files.
	projA := filepath.Join(dir, "projects", "-users-me-project-a")
	projB := filepath.Join(dir, "projects", "-users-me-project-b")
	if err := os.MkdirAll(projA, 0755); err != nil {
		t.Fatal(err)
	}
	if err := os.MkdirAll(projB, 0755); err != nil {
		t.Fatal(err)
	}

	sess1 := `{"type":"user","uuid":"u1","sessionId":"sess-1","timestamp":1700000000000,"message":{"role":"user","content":[{"type":"text","text":"hello world"}]}}
{"type":"assistant","uuid":"a1","sessionId":"sess-1","timestamp":1700000001000,"message":{"role":"assistant","model":"claude-sonnet-4-20250514","content":[{"type":"text","text":"Hi there!"}],"usage":{"input_tokens":10,"output_tokens":5,"costUSD":0.003}}}
`
	sess2 := `{"type":"user","uuid":"u2","sessionId":"sess-2","timestamp":1700001000000,"message":{"role":"user","content":[{"type":"text","text":"second session"}]}}
`
	if err := os.WriteFile(filepath.Join(projA, "sess-1.jsonl"), []byte(sess1), 0644); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(projB, "sess-2.jsonl"), []byte(sess2), 0644); err != nil {
		t.Fatal(err)
	}

	return dir
}

func newTestServer(t *testing.T) *Server {
	t.Helper()
	dir := setupTestDir(t)
	srv, err := New(Config{ClaudeDir: dir})
	if err != nil {
		t.Fatalf("New() error: %v", err)
	}
	return srv
}

func TestHealthEndpoint(t *testing.T) {
	srv := newTestServer(t)
	req := httptest.NewRequest("GET", "/api/health", nil)
	w := httptest.NewRecorder()
	srv.mux.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}

	var body map[string]string
	json.NewDecoder(w.Body).Decode(&body)
	if body["status"] != "ok" {
		t.Fatalf("expected status ok, got %q", body["status"])
	}
}

func TestListSessions(t *testing.T) {
	srv := newTestServer(t)
	req := httptest.NewRequest("GET", "/api/sessions", nil)
	w := httptest.NewRecorder()
	srv.mux.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}

	var page PaginatedSessionsResponse
	json.NewDecoder(w.Body).Decode(&page)
	sessions := page.Sessions
	if len(sessions) != 2 {
		t.Fatalf("expected 2 sessions, got %d", len(sessions))
	}

	// Should be sorted by timestamp descending (sess-2 first).
	if sessions[0].ID != "sess-2" {
		t.Errorf("expected first session to be sess-2, got %s", sessions[0].ID)
	}
	if sessions[1].ID != "sess-1" {
		t.Errorf("expected second session to be sess-1, got %s", sessions[1].ID)
	}

	// Verify ISO timestamp format.
	if sessions[0].Timestamp == "" {
		t.Error("expected non-empty timestamp")
	}
}

func TestListSessionsFilterByDir(t *testing.T) {
	srv := newTestServer(t)
	req := httptest.NewRequest("GET", "/api/sessions?dir=project-a", nil)
	w := httptest.NewRecorder()
	srv.mux.ServeHTTP(w, req)

	var page PaginatedSessionsResponse
	json.NewDecoder(w.Body).Decode(&page)
	sessions := page.Sessions
	if len(sessions) != 1 {
		t.Fatalf("expected 1 session, got %d", len(sessions))
	}
	if sessions[0].ID != "sess-1" {
		t.Errorf("expected sess-1, got %s", sessions[0].ID)
	}
}

func TestListSessionsSearchByQuery(t *testing.T) {
	srv := newTestServer(t)
	// Enrich so slugs are populated from session files.
	srv.index.Enrich(srv.claudeDir)

	tests := []struct {
		query   string
		wantIDs []string
	}{
		{"hello", []string{"sess-1"}},     // matches slug "hello world"
		{"project-b", []string{"sess-2"}}, // matches project path
		{"HELLO", []string{"sess-1"}},     // case-insensitive
		{"nonexistent", nil},              // no match
		{"session", []string{"sess-2"}},   // matches slug "second session"
	}

	for _, tt := range tests {
		t.Run(tt.query, func(t *testing.T) {
			req := httptest.NewRequest("GET", "/api/sessions?q="+tt.query, nil)
			w := httptest.NewRecorder()
			srv.mux.ServeHTTP(w, req)

			var page PaginatedSessionsResponse
			json.NewDecoder(w.Body).Decode(&page)

			var gotIDs []string
			for _, s := range page.Sessions {
				gotIDs = append(gotIDs, s.ID)
			}

			if len(gotIDs) != len(tt.wantIDs) {
				t.Fatalf("q=%q: got %v, want %v", tt.query, gotIDs, tt.wantIDs)
			}
			for i, id := range tt.wantIDs {
				if gotIDs[i] != id {
					t.Errorf("q=%q: got[%d]=%s, want %s", tt.query, i, gotIDs[i], id)
				}
			}
		})
	}
}

func TestGetSession(t *testing.T) {
	srv := newTestServer(t)
	req := httptest.NewRequest("GET", "/api/sessions/sess-1", nil)
	w := httptest.NewRecorder()
	srv.mux.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}

	var detail SessionDetailResponse
	json.NewDecoder(w.Body).Decode(&detail)

	if detail.ID != "sess-1" {
		t.Errorf("expected id sess-1, got %s", detail.ID)
	}
	if len(detail.Messages) != 2 {
		t.Fatalf("expected 2 messages, got %d", len(detail.Messages))
	}
	if detail.Messages[0].Type != "user" {
		t.Errorf("expected first message type user, got %s", detail.Messages[0].Type)
	}
	if detail.Messages[1].Type != "assistant" {
		t.Errorf("expected second message type assistant, got %s", detail.Messages[1].Type)
	}
}

func TestGetSessionNotFound(t *testing.T) {
	srv := newTestServer(t)
	req := httptest.NewRequest("GET", "/api/sessions/nonexistent", nil)
	w := httptest.NewRecorder()
	srv.mux.ServeHTTP(w, req)

	if w.Code != http.StatusNotFound {
		t.Fatalf("expected 404, got %d", w.Code)
	}
}

func TestCORSAllowsLocalhostOrigin(t *testing.T) {
	srv := newTestServer(t)
	handler := corsHandler(3000, srv.mux)

	req := httptest.NewRequest("GET", "/api/health", nil)
	req.Header.Set("Origin", "http://localhost:3000")
	w := httptest.NewRecorder()
	handler.ServeHTTP(w, req)

	if got := w.Header().Get("Access-Control-Allow-Origin"); got != "http://localhost:3000" {
		t.Errorf("expected CORS origin http://localhost:3000, got %q", got)
	}
}

func TestCORSRejectsExternalOrigin(t *testing.T) {
	srv := newTestServer(t)
	handler := corsHandler(3000, srv.mux)

	req := httptest.NewRequest("GET", "/api/health", nil)
	req.Header.Set("Origin", "https://evil.com")
	w := httptest.NewRecorder()
	handler.ServeHTTP(w, req)

	if got := w.Header().Get("Access-Control-Allow-Origin"); got != "" {
		t.Errorf("expected no CORS origin header for external origin, got %q", got)
	}
}

func TestCORSRejectsWildcard(t *testing.T) {
	srv := newTestServer(t)
	handler := corsHandler(3000, srv.mux)

	req := httptest.NewRequest("GET", "/api/health", nil)
	w := httptest.NewRecorder()
	handler.ServeHTTP(w, req)

	if got := w.Header().Get("Access-Control-Allow-Origin"); got == "*" {
		t.Error("CORS header must not be wildcard *")
	}
}

func TestCORSAllows127001Origin(t *testing.T) {
	srv := newTestServer(t)
	handler := corsHandler(3000, srv.mux)

	req := httptest.NewRequest("GET", "/api/health", nil)
	req.Header.Set("Origin", "http://127.0.0.1:3000")
	w := httptest.NewRecorder()
	handler.ServeHTTP(w, req)

	if got := w.Header().Get("Access-Control-Allow-Origin"); got != "http://127.0.0.1:3000" {
		t.Errorf("expected CORS origin http://127.0.0.1:3000, got %q", got)
	}
}

func TestCORSPreflight(t *testing.T) {
	srv := newTestServer(t)
	handler := corsHandler(3000, srv.mux)

	req := httptest.NewRequest("OPTIONS", "/api/sessions", nil)
	req.Header.Set("Origin", "http://localhost:3000")
	w := httptest.NewRecorder()
	handler.ServeHTTP(w, req)

	if w.Code != http.StatusNoContent {
		t.Errorf("expected 204 for OPTIONS, got %d", w.Code)
	}
}

func TestCORSNoOriginHeader(t *testing.T) {
	srv := newTestServer(t)
	handler := corsHandler(3000, srv.mux)

	// Same-origin requests have no Origin header; should still serve content.
	req := httptest.NewRequest("GET", "/api/health", nil)
	w := httptest.NewRecorder()
	handler.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200 for same-origin request, got %d", w.Code)
	}
	if got := w.Header().Get("Access-Control-Allow-Origin"); got != "" {
		t.Errorf("expected no CORS header for same-origin, got %q", got)
	}
}

func TestSessionResponseUsesIDNotSessionID(t *testing.T) {
	srv := newTestServer(t)
	req := httptest.NewRequest("GET", "/api/sessions", nil)
	w := httptest.NewRecorder()
	srv.mux.ServeHTTP(w, req)

	// Verify raw JSON uses "id" not "sessionId".
	var rawPage map[string]any
	json.NewDecoder(w.Body).Decode(&rawPage)
	raw := rawPage["sessions"].([]any)
	for _, item := range raw {
		s := item.(map[string]any)
		if _, ok := s["id"]; !ok {
			t.Error("expected 'id' field in response")
		}
		if _, ok := s["sessionId"]; ok {
			t.Error("unexpected 'sessionId' field in response")
		}
	}
}

func TestTimestampFormat(t *testing.T) {
	got := msToISO(1700000000000)
	want := "2023-11-14T22:13:20Z"
	if got != want {
		t.Errorf("msToISO(1700000000000) = %q, want %q", got, want)
	}
}

func TestMsToISOZero(t *testing.T) {
	if got := msToISO(0); got != "" {
		t.Errorf("msToISO(0) = %q, want empty string", got)
	}
}

func TestContentTypeJSON(t *testing.T) {
	srv := newTestServer(t)
	endpoints := []string{"/api/health", "/api/sessions", "/api/sessions/sess-1"}
	for _, ep := range endpoints {
		t.Run(ep, func(t *testing.T) {
			req := httptest.NewRequest("GET", ep, nil)
			w := httptest.NewRecorder()
			srv.mux.ServeHTTP(w, req)
			ct := w.Header().Get("Content-Type")
			if ct != "application/json" {
				t.Errorf("expected Content-Type application/json, got %q", ct)
			}
		})
	}
}

func TestEmptySessionList(t *testing.T) {
	srv := newTestServer(t)
	req := httptest.NewRequest("GET", "/api/sessions?dir=nonexistent", nil)
	w := httptest.NewRecorder()
	srv.mux.ServeHTTP(w, req)

	var page PaginatedSessionsResponse
	json.NewDecoder(w.Body).Decode(&page)
	if page.Sessions == nil {
		t.Error("expected empty array, got null")
	}
	if len(page.Sessions) != 0 {
		fmt.Printf("sessions: %v\n", page.Sessions)
		t.Errorf("expected 0 sessions, got %d", len(page.Sessions))
	}
	if page.Total != 0 {
		t.Errorf("expected total 0, got %d", page.Total)
	}
}

// --- New tests for expanded coverage ---

func TestListSessionsFilterByModel(t *testing.T) {
	srv := newTestServer(t)
	srv.index.Enrich(srv.claudeDir)

	req := httptest.NewRequest("GET", "/api/sessions?model=claude-sonnet-4-20250514", nil)
	w := httptest.NewRecorder()
	srv.mux.ServeHTTP(w, req)

	var page PaginatedSessionsResponse
	json.NewDecoder(w.Body).Decode(&page)
	if len(page.Sessions) != 1 {
		t.Fatalf("expected 1 session for model filter, got %d", len(page.Sessions))
	}
	if page.Sessions[0].ID != "sess-1" {
		t.Errorf("expected sess-1, got %s", page.Sessions[0].ID)
	}
}

func TestListSessionsFilterByActivityState(t *testing.T) {
	srv := newTestServer(t)
	srv.index.Enrich(srv.claudeDir)

	// All sessions have old timestamps, so all should be idle.
	req := httptest.NewRequest("GET", "/api/sessions?activityState=idle", nil)
	w := httptest.NewRecorder()
	srv.mux.ServeHTTP(w, req)

	var page PaginatedSessionsResponse
	json.NewDecoder(w.Body).Decode(&page)
	if len(page.Sessions) != 2 {
		t.Fatalf("expected 2 idle sessions, got %d", len(page.Sessions))
	}

	// Non-matching state should return empty.
	req = httptest.NewRequest("GET", "/api/sessions?activityState=working", nil)
	w = httptest.NewRecorder()
	srv.mux.ServeHTTP(w, req)

	json.NewDecoder(w.Body).Decode(&page)
	if len(page.Sessions) != 0 {
		t.Errorf("expected 0 working sessions, got %d", len(page.Sessions))
	}
}

func TestListSessionsFilterByTimestampRange(t *testing.T) {
	srv := newTestServer(t)

	// sess-1 timestamp: 1700000000000, sess-2 timestamp: 1700001000000
	// Filter from=1700000500000 should only return sess-2.
	req := httptest.NewRequest("GET", "/api/sessions?from=1700000500000", nil)
	w := httptest.NewRecorder()
	srv.mux.ServeHTTP(w, req)

	var page PaginatedSessionsResponse
	json.NewDecoder(w.Body).Decode(&page)
	if len(page.Sessions) != 1 {
		t.Fatalf("expected 1 session with from filter, got %d", len(page.Sessions))
	}
	if page.Sessions[0].ID != "sess-2" {
		t.Errorf("expected sess-2, got %s", page.Sessions[0].ID)
	}

	// Filter to=1700000500000 should only return sess-1.
	req = httptest.NewRequest("GET", "/api/sessions?to=1700000500000", nil)
	w = httptest.NewRecorder()
	srv.mux.ServeHTTP(w, req)

	json.NewDecoder(w.Body).Decode(&page)
	if len(page.Sessions) != 1 {
		t.Fatalf("expected 1 session with to filter, got %d", len(page.Sessions))
	}
	if page.Sessions[0].ID != "sess-1" {
		t.Errorf("expected sess-1, got %s", page.Sessions[0].ID)
	}
}

func TestListSessionsPagination(t *testing.T) {
	srv := newTestServer(t)

	// Limit to 1 result.
	req := httptest.NewRequest("GET", "/api/sessions?limit=1", nil)
	w := httptest.NewRecorder()
	srv.mux.ServeHTTP(w, req)

	var page PaginatedSessionsResponse
	json.NewDecoder(w.Body).Decode(&page)
	if len(page.Sessions) != 1 {
		t.Fatalf("expected 1 session with limit=1, got %d", len(page.Sessions))
	}
	if page.Total != 2 {
		t.Errorf("expected total 2, got %d", page.Total)
	}
	// Should get the first (most recent) session.
	if page.Sessions[0].ID != "sess-2" {
		t.Errorf("expected sess-2 (most recent), got %s", page.Sessions[0].ID)
	}

	// Offset=1 with limit=1 should return the second session.
	req = httptest.NewRequest("GET", "/api/sessions?limit=1&offset=1", nil)
	w = httptest.NewRecorder()
	srv.mux.ServeHTTP(w, req)

	json.NewDecoder(w.Body).Decode(&page)
	if len(page.Sessions) != 1 {
		t.Fatalf("expected 1 session with offset, got %d", len(page.Sessions))
	}
	if page.Sessions[0].ID != "sess-1" {
		t.Errorf("expected sess-1, got %s", page.Sessions[0].ID)
	}

	// Offset beyond total should return empty.
	req = httptest.NewRequest("GET", "/api/sessions?limit=10&offset=100", nil)
	w = httptest.NewRecorder()
	srv.mux.ServeHTTP(w, req)

	json.NewDecoder(w.Body).Decode(&page)
	if len(page.Sessions) != 0 {
		t.Errorf("expected 0 sessions with large offset, got %d", len(page.Sessions))
	}
}

func TestConfigEndpoint(t *testing.T) {
	srv := newTestServer(t)
	req := httptest.NewRequest("GET", "/api/config", nil)
	w := httptest.NewRecorder()
	srv.mux.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}

	var cfg ConfigResponse
	json.NewDecoder(w.Body).Decode(&cfg)
	if cfg.ClaudeDir == "" {
		t.Error("expected non-empty claudeDir")
	}
	if cfg.Standalone {
		t.Error("expected standalone to be false")
	}
}

func TestPricingEndpoint(t *testing.T) {
	srv := newTestServer(t)
	req := httptest.NewRequest("GET", "/api/pricing", nil)
	w := httptest.NewRecorder()
	srv.mux.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}
	ct := w.Header().Get("Content-Type")
	if ct != "application/json" {
		t.Errorf("expected Content-Type application/json, got %q", ct)
	}
	if w.Body.Len() == 0 {
		t.Error("expected non-empty pricing response")
	}
}

func TestSettingsEndpoints(t *testing.T) {
	dir := setupTestDir(t)
	settingsPath := filepath.Join(dir, "settings.json")

	srv, err := New(Config{ClaudeDir: dir, SettingsPath: settingsPath})
	if err != nil {
		t.Fatalf("New() error: %v", err)
	}

	// GET settings should return defaults.
	req := httptest.NewRequest("GET", "/api/settings", nil)
	w := httptest.NewRecorder()
	srv.mux.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("GET settings: expected 200, got %d", w.Code)
	}

	// PUT settings with valid body.
	body := `{"theme":"dark"}`
	req = httptest.NewRequest("PUT", "/api/settings", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w = httptest.NewRecorder()
	srv.mux.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("PUT settings: expected 200, got %d; body: %s", w.Code, w.Body.String())
	}

	// Verify the setting persisted.
	req = httptest.NewRequest("GET", "/api/settings", nil)
	w = httptest.NewRecorder()
	srv.mux.ServeHTTP(w, req)

	var raw map[string]any
	json.NewDecoder(w.Body).Decode(&raw)
	if raw["theme"] != "dark" {
		t.Errorf("expected theme dark after update, got %v", raw["theme"])
	}
}

func TestSettingsEndpointTooLargeBody(t *testing.T) {
	dir := setupTestDir(t)
	settingsPath := filepath.Join(dir, "settings.json")

	srv, err := New(Config{ClaudeDir: dir, SettingsPath: settingsPath})
	if err != nil {
		t.Fatalf("New() error: %v", err)
	}

	// Body exceeding 10KB should be rejected.
	bigBody := strings.Repeat("x", 11*1024)
	req := httptest.NewRequest("PUT", "/api/settings", strings.NewReader(bigBody))
	w := httptest.NewRecorder()
	srv.mux.ServeHTTP(w, req)

	if w.Code != http.StatusRequestEntityTooLarge {
		t.Errorf("expected 413, got %d", w.Code)
	}
}

func TestSearchEndpoint(t *testing.T) {
	srv := newTestServer(t)
	srv.index.Enrich(srv.claudeDir)

	// Search for content in sess-1.
	req := httptest.NewRequest("GET", "/api/search?q=hello+world", nil)
	w := httptest.NewRecorder()
	srv.mux.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}

	var resp SearchResponse
	json.NewDecoder(w.Body).Decode(&resp)
	if resp.Results == nil {
		t.Error("expected results array, got nil")
	}
}

func TestSearchEndpointMissingQuery(t *testing.T) {
	srv := newTestServer(t)

	req := httptest.NewRequest("GET", "/api/search", nil)
	w := httptest.NewRecorder()
	srv.mux.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 for missing q param, got %d", w.Code)
	}
}

func TestSearchEndpointWithLimit(t *testing.T) {
	srv := newTestServer(t)
	srv.index.Enrich(srv.claudeDir)

	req := httptest.NewRequest("GET", "/api/search?q=hello&limit=5", nil)
	w := httptest.NewRecorder()
	srv.mux.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}
}

func TestActivityEndpoint(t *testing.T) {
	srv := newTestServer(t)

	req := httptest.NewRequest("GET", "/api/activity", nil)
	w := httptest.NewRecorder()
	srv.mux.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}

	var resp ActivityResponse
	json.NewDecoder(w.Body).Decode(&resp)

	if resp.Days == nil {
		t.Error("expected days array")
	}
	if len(resp.Hours) != 24 {
		t.Errorf("expected 24 hours, got %d", len(resp.Hours))
	}
	if resp.Dirs == nil {
		t.Error("expected dirs array")
	}
}

func TestActivityEndpointWithDirFilter(t *testing.T) {
	srv := newTestServer(t)

	req := httptest.NewRequest("GET", "/api/activity?dir=project-a", nil)
	w := httptest.NewRecorder()
	srv.mux.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}

	var resp ActivityResponse
	json.NewDecoder(w.Body).Decode(&resp)

	// Should still include all dirs in the dirs list.
	if len(resp.Dirs) < 2 {
		t.Errorf("expected at least 2 dirs in the list, got %d", len(resp.Dirs))
	}

	// But day counts should only reflect project-a sessions.
	totalCount := 0
	for _, d := range resp.Days {
		totalCount += d.Count
	}
	if totalCount != 1 {
		t.Errorf("expected 1 session day count for project-a, got %d", totalCount)
	}
}

func TestCORSAllowsIPv6Origin(t *testing.T) {
	srv := newTestServer(t)
	handler := corsHandler(3000, srv.mux)

	req := httptest.NewRequest("GET", "/api/health", nil)
	req.Header.Set("Origin", "http://[::1]:3000")
	w := httptest.NewRecorder()
	handler.ServeHTTP(w, req)

	if got := w.Header().Get("Access-Control-Allow-Origin"); got != "http://[::1]:3000" {
		t.Errorf("expected CORS origin http://[::1]:3000, got %q", got)
	}
}

func TestCORSAllowsHTTPS(t *testing.T) {
	srv := newTestServer(t)
	handler := corsHandler(3000, srv.mux)

	req := httptest.NewRequest("GET", "/api/health", nil)
	req.Header.Set("Origin", "https://localhost:3000")
	w := httptest.NewRecorder()
	handler.ServeHTTP(w, req)

	if got := w.Header().Get("Access-Control-Allow-Origin"); got != "https://localhost:3000" {
		t.Errorf("expected CORS origin https://localhost:3000, got %q", got)
	}
}

func TestCORSRejectsWrongPort(t *testing.T) {
	srv := newTestServer(t)
	handler := corsHandler(3000, srv.mux)

	req := httptest.NewRequest("GET", "/api/health", nil)
	req.Header.Set("Origin", "http://localhost:9999")
	w := httptest.NewRecorder()
	handler.ServeHTTP(w, req)

	if got := w.Header().Get("Access-Control-Allow-Origin"); got != "" {
		t.Errorf("expected no CORS for wrong port, got %q", got)
	}
}

func TestGetSessionStreamNotFound(t *testing.T) {
	srv := newTestServer(t)
	req := httptest.NewRequest("GET", "/api/sessions/nonexistent/stream", nil)
	w := httptest.NewRecorder()
	srv.mux.ServeHTTP(w, req)

	if w.Code != http.StatusNotFound {
		t.Fatalf("expected 404, got %d", w.Code)
	}
}

func TestToSessionResponse(t *testing.T) {
	meta := session.SessionMeta{
		SessionID:     "test-id",
		Project:       "/users/test/proj",
		CustomTitle:   "My Title",
		Timestamp:     1700000000000,
		MessageCount:  5,
		Model:         "claude-sonnet-4-20250514",
		Slug:          "hello world",
		ActivityState: "idle",
	}
	resp := toSessionResponse(meta)

	if resp.ID != "test-id" {
		t.Errorf("ID = %q, want %q", resp.ID, "test-id")
	}
	if resp.CustomTitle != "My Title" {
		t.Errorf("CustomTitle = %q, want %q", resp.CustomTitle, "My Title")
	}
	if resp.Timestamp == "" {
		t.Error("expected non-empty timestamp")
	}
	if resp.ActivityState != "idle" {
		t.Errorf("ActivityState = %q, want %q", resp.ActivityState, "idle")
	}
}

func TestToMessageResponse(t *testing.T) {
	msg := claude.Message{
		UUID:      "msg-1",
		Type:      claude.MessageTypeUser,
		Timestamp: claude.Timestamp(1700000000000),
		IsMeta:    false,
		Message: &claude.APIMessage{
			Role:    "user",
			Content: []claude.ContentBlock{{Type: "text", Text: "hello"}},
		},
	}
	resp := toMessageResponse(msg)

	if resp.UUID != "msg-1" {
		t.Errorf("UUID = %q, want %q", resp.UUID, "msg-1")
	}
	if resp.Type != "user" {
		t.Errorf("Type = %q, want %q", resp.Type, "user")
	}
	if resp.Timestamp == "" {
		t.Error("expected non-empty timestamp")
	}
	if resp.Message == nil {
		t.Error("expected non-nil message")
	}
}

func TestProjectsEndpoints(t *testing.T) {
	dir := setupTestDir(t)
	projectsPath := filepath.Join(dir, "projects.json")

	srv, err := New(Config{ClaudeDir: dir, SettingsPath: filepath.Join(dir, "settings.json"), ProjectsPath: projectsPath})
	if err != nil {
		t.Fatalf("New() error: %v", err)
	}

	// GET projects should return empty list.
	req := httptest.NewRequest("GET", "/api/projects", nil)
	w := httptest.NewRecorder()
	srv.mux.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("GET projects: expected 200, got %d", w.Code)
	}

	var initial []any
	json.NewDecoder(w.Body).Decode(&initial)
	if len(initial) != 0 {
		t.Errorf("expected empty list, got %d items", len(initial))
	}

	// PUT projects with valid body.
	body := `[{"id":"1","name":"Alpha","folderPaths":["/path/a"]},{"id":"2","name":"Beta","folderPaths":["/path/b"]}]`
	req = httptest.NewRequest("PUT", "/api/projects", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w = httptest.NewRecorder()
	srv.mux.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("PUT projects: expected 200, got %d; body: %s", w.Code, w.Body.String())
	}

	// Verify projects persisted via GET.
	req = httptest.NewRequest("GET", "/api/projects", nil)
	w = httptest.NewRecorder()
	srv.mux.ServeHTTP(w, req)

	var projects []map[string]any
	json.NewDecoder(w.Body).Decode(&projects)
	if len(projects) != 2 {
		t.Fatalf("expected 2 projects, got %d", len(projects))
	}
	if projects[0]["name"] != "Alpha" {
		t.Errorf("expected Alpha, got %v", projects[0]["name"])
	}
}

func TestProjectsEndpointValidation(t *testing.T) {
	dir := setupTestDir(t)
	projectsPath := filepath.Join(dir, "projects.json")

	srv, err := New(Config{ClaudeDir: dir, SettingsPath: filepath.Join(dir, "settings.json"), ProjectsPath: projectsPath})
	if err != nil {
		t.Fatalf("New() error: %v", err)
	}

	// PUT with missing required fields should fail.
	body := `[{"id":"","name":""}]`
	req := httptest.NewRequest("PUT", "/api/projects", strings.NewReader(body))
	w := httptest.NewRecorder()
	srv.mux.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestProjectsEndpointTooLargeBody(t *testing.T) {
	dir := setupTestDir(t)
	projectsPath := filepath.Join(dir, "projects.json")

	srv, err := New(Config{ClaudeDir: dir, SettingsPath: filepath.Join(dir, "settings.json"), ProjectsPath: projectsPath})
	if err != nil {
		t.Fatalf("New() error: %v", err)
	}

	bigBody := strings.Repeat("x", 101*1024)
	req := httptest.NewRequest("PUT", "/api/projects", strings.NewReader(bigBody))
	w := httptest.NewRecorder()
	srv.mux.ServeHTTP(w, req)

	if w.Code != http.StatusRequestEntityTooLarge {
		t.Errorf("expected 413, got %d", w.Code)
	}
}
