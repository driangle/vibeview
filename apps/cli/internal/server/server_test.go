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

	"github.com/driangle/vibeview/apps/lib/session"
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
	if err := json.NewDecoder(w.Body).Decode(&body); err != nil {
		t.Fatal(err)
	}
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
	if err := json.NewDecoder(w.Body).Decode(&page); err != nil {
		t.Fatal(err)
	}
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
	if err := json.NewDecoder(w.Body).Decode(&page); err != nil {
		t.Fatal(err)
	}
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
		{"sess-1", []string{"sess-1"}},    // full session ID
		{"SESS-1", []string{"sess-1"}},    // session ID, case-insensitive
		// partial session ID substring matches both, timestamp desc order
		{"sess-", []string{"sess-2", "sess-1"}},
	}

	for _, tt := range tests {
		t.Run(tt.query, func(t *testing.T) {
			req := httptest.NewRequest("GET", "/api/sessions?q="+tt.query, nil)
			w := httptest.NewRecorder()
			srv.mux.ServeHTTP(w, req)

			var page PaginatedSessionsResponse
			if err := json.NewDecoder(w.Body).Decode(&page); err != nil {
				t.Fatal(err)
			}

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
	if err := json.NewDecoder(w.Body).Decode(&detail); err != nil {
		t.Fatal(err)
	}

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

// setupPartialSession registers a session whose file contains one valid line and
// one malformed line, returning a server that knows about it. It exercises the
// graceful-degradation path where the parser skips-and-counts a bad line.
func setupPartialSession(t *testing.T) *Server {
	t.Helper()
	claudeDir := t.TempDir()

	projDir := filepath.Join(claudeDir, "projects", "-users-me-partial")
	if err := os.MkdirAll(projDir, 0755); err != nil {
		t.Fatal(err)
	}
	filePath := filepath.Join(projDir, "partial.jsonl")
	content := `{"type":"user","uuid":"u1","sessionId":"partial","timestamp":1700000000000,"message":{"role":"user","content":[{"type":"text","text":"hello"}]}}
{ this is not valid json
`
	if err := os.WriteFile(filePath, []byte(content), 0644); err != nil {
		t.Fatal(err)
	}

	idx := &session.Index{Sessions: []session.SessionMeta{{
		SessionID: "partial",
		Project:   "/users/me/partial",
		FilePath:  filePath,
		Timestamp: 1700000000000,
	}}}

	srv, err := New(Config{ClaudeDir: claudeDir, Index: idx, Standalone: true})
	if err != nil {
		t.Fatalf("New() error: %v", err)
	}
	return srv
}

// A malformed line must not sink the whole request: the handler should return
// 200 with the messages that did parse and a non-zero skipped count.
func TestGetSessionReturnsPartialContentOnMalformedLine(t *testing.T) {
	srv := setupPartialSession(t)
	req := httptest.NewRequest("GET", "/api/sessions/partial", nil)
	w := httptest.NewRecorder()
	srv.mux.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200 with partial content, got %d", w.Code)
	}

	var detail SessionDetailResponse
	if err := json.NewDecoder(w.Body).Decode(&detail); err != nil {
		t.Fatal(err)
	}
	if len(detail.Messages) != 1 {
		t.Fatalf("expected 1 parsed message, got %d", len(detail.Messages))
	}
	if detail.SkippedLines < 1 {
		t.Errorf("expected non-zero skipped count, got %d", detail.SkippedLines)
	}
}

// setupSymlinkedSession creates a claude directory holding a session whose file
// is a symlink pointing at a real JSONL file OUTSIDE the claude directory, and
// returns a server whose index knows about that session. It exercises the
// symlink-containment guard on the read path.
func setupSymlinkedSession(t *testing.T) *Server {
	t.Helper()
	claudeDir := t.TempDir()

	// A real session file living outside the claude directory.
	outside := t.TempDir()
	outsideFile := filepath.Join(outside, "secret.jsonl")
	line := `{"type":"user","uuid":"x","sessionId":"evil","timestamp":1700000000000,"message":{"role":"user","content":[{"type":"text","text":"secret"}]}}` + "\n"
	if err := os.WriteFile(outsideFile, []byte(line), 0644); err != nil {
		t.Fatal(err)
	}

	// The session's file path is a symlink inside the claude directory that
	// points outside it.
	projDir := filepath.Join(claudeDir, "projects", "-users-me-evil")
	if err := os.MkdirAll(projDir, 0755); err != nil {
		t.Fatal(err)
	}
	linkPath := filepath.Join(projDir, "evil.jsonl")
	if err := os.Symlink(outsideFile, linkPath); err != nil {
		t.Fatal(err)
	}

	idx := &session.Index{Sessions: []session.SessionMeta{{
		SessionID: "evil",
		Project:   "/users/me/evil",
		FilePath:  linkPath,
		Timestamp: 1700000000000,
	}}}

	srv, err := New(Config{ClaudeDir: claudeDir, Index: idx, Standalone: true})
	if err != nil {
		t.Fatalf("New() error: %v", err)
	}
	return srv
}

func TestGetSessionRejectsSymlinkOutsideClaudeDir(t *testing.T) {
	srv := setupSymlinkedSession(t)

	req := httptest.NewRequest("GET", "/api/sessions/evil", nil)
	w := httptest.NewRecorder()
	srv.mux.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 for symlinked session outside claude dir, got %d", w.Code)
	}
}

func TestGetSubagentRejectsSymlinkOutsideClaudeDir(t *testing.T) {
	srv := setupSymlinkedSession(t)

	// The subagent read path derives its directory from the session file path,
	// so it must reject a symlinked session before touching the filesystem.
	req := httptest.NewRequest("GET", "/api/sessions/evil/subagents/agent-1", nil)
	w := httptest.NewRecorder()
	srv.mux.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 for symlinked session on subagent path, got %d", w.Code)
	}
}

func TestCORSAllowsLocalhostOrigin(t *testing.T) {
	srv := newTestServer(t)
	handler := corsHandler(3000, nil, srv.mux)

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
	handler := corsHandler(3000, nil, srv.mux)

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
	handler := corsHandler(3000, nil, srv.mux)

	req := httptest.NewRequest("GET", "/api/health", nil)
	w := httptest.NewRecorder()
	handler.ServeHTTP(w, req)

	if got := w.Header().Get("Access-Control-Allow-Origin"); got == "*" {
		t.Error("CORS header must not be wildcard *")
	}
}

func TestCORSAllows127001Origin(t *testing.T) {
	srv := newTestServer(t)
	handler := corsHandler(3000, nil, srv.mux)

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
	handler := corsHandler(3000, nil, srv.mux)

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
	handler := corsHandler(3000, nil, srv.mux)

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
	if err := json.NewDecoder(w.Body).Decode(&rawPage); err != nil {
		t.Fatal(err)
	}
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
	if err := json.NewDecoder(w.Body).Decode(&page); err != nil {
		t.Fatal(err)
	}
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
	if err := json.NewDecoder(w.Body).Decode(&page); err != nil {
		t.Fatal(err)
	}
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
	if err := json.NewDecoder(w.Body).Decode(&page); err != nil {
		t.Fatal(err)
	}
	if len(page.Sessions) != 2 {
		t.Fatalf("expected 2 idle sessions, got %d", len(page.Sessions))
	}

	// Non-matching state should return empty.
	req = httptest.NewRequest("GET", "/api/sessions?activityState=working", nil)
	w = httptest.NewRecorder()
	srv.mux.ServeHTTP(w, req)

	if err := json.NewDecoder(w.Body).Decode(&page); err != nil {
		t.Fatal(err)
	}
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
	if err := json.NewDecoder(w.Body).Decode(&page); err != nil {
		t.Fatal(err)
	}
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

	if err := json.NewDecoder(w.Body).Decode(&page); err != nil {
		t.Fatal(err)
	}
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
	if err := json.NewDecoder(w.Body).Decode(&page); err != nil {
		t.Fatal(err)
	}
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

	if err := json.NewDecoder(w.Body).Decode(&page); err != nil {
		t.Fatal(err)
	}
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

	if err := json.NewDecoder(w.Body).Decode(&page); err != nil {
		t.Fatal(err)
	}
	if len(page.Sessions) != 0 {
		t.Errorf("expected 0 sessions with large offset, got %d", len(page.Sessions))
	}
}

// setupSortableServer builds a claude directory with three sessions whose token
// and cost totals are deliberately distinct and ordered differently, so tests can
// tell which sort column was applied. Slugs are distinct (apple/banana/cherry) so
// name-sort is meaningful, and cost comes from a result message's total_cost_usd
// (the only source the enricher reads for cost). Returns an enriched server.
//
//	session   slug     timestamp        tokens (in+out)   costUSD
//	sess-a    apple    1700000000000    500               0.10
//	sess-b    banana   1700001000000    100               0.30
//	sess-c    cherry   1700002000000    300               0.20
func setupSortableServer(t *testing.T) *Server {
	t.Helper()
	dir := t.TempDir()

	history := `{"sessionId":"sess-a","project":"/users/me/proj","display":"apple","timestamp":1700000000000}
{"sessionId":"sess-b","project":"/users/me/proj","display":"banana","timestamp":1700001000000}
{"sessionId":"sess-c","project":"/users/me/proj","display":"cherry","timestamp":1700002000000}
`
	if err := os.WriteFile(filepath.Join(dir, "history.jsonl"), []byte(history), 0644); err != nil {
		t.Fatal(err)
	}

	proj := filepath.Join(dir, "projects", "-users-me-proj")
	if err := os.MkdirAll(proj, 0755); err != nil {
		t.Fatal(err)
	}

	// Each session: a user message (its text becomes the slug used for name-sort),
	// an assistant message carrying token usage, and a result message carrying cost.
	sessions := map[string]struct {
		slug    string
		ts      int64
		in, out int
		cost    float64
	}{
		"sess-a": {"apple", 1700000000000, 500, 0, 0.10},
		"sess-b": {"banana", 1700001000000, 100, 0, 0.30},
		"sess-c": {"cherry", 1700002000000, 200, 100, 0.20},
	}
	for id, s := range sessions {
		content := fmt.Sprintf(
			`{"type":"user","uuid":"u-%s","sessionId":"%s","timestamp":%d,"message":{"role":"user","content":[{"type":"text","text":"%s"}]}}
{"type":"assistant","uuid":"a-%s","sessionId":"%s","timestamp":%d,"message":{"role":"assistant","model":"claude-sonnet-4-20250514","content":[{"type":"text","text":"ok"}],"usage":{"input_tokens":%d,"output_tokens":%d}}}
{"type":"result","uuid":"r-%s","sessionId":"%s","timestamp":%d,"total_cost_usd":%g}
`,
			id, id, s.ts, s.slug, id, id, s.ts+1000, s.in, s.out, id, id, s.ts+2000, s.cost)
		if err := os.WriteFile(filepath.Join(proj, id+".jsonl"), []byte(content), 0644); err != nil {
			t.Fatal(err)
		}
	}

	srv, err := New(Config{ClaudeDir: dir})
	if err != nil {
		t.Fatalf("New() error: %v", err)
	}
	srv.index.Enrich(srv.claudeDir)
	return srv
}

// pageOrder fetches a sessions page for the given query and returns the session IDs.
func pageOrder(t *testing.T, srv *Server, query string) []string {
	t.Helper()
	req := httptest.NewRequest("GET", "/api/sessions?"+query, nil)
	w := httptest.NewRecorder()
	srv.mux.ServeHTTP(w, req)
	if w.Code != http.StatusOK {
		t.Fatalf("query %q: expected 200, got %d", query, w.Code)
	}
	var page PaginatedSessionsResponse
	if err := json.NewDecoder(w.Body).Decode(&page); err != nil {
		t.Fatal(err)
	}
	ids := make([]string, 0, len(page.Sessions))
	for _, s := range page.Sessions {
		ids = append(ids, s.ID)
	}
	return ids
}

func TestListSessionsServerSort(t *testing.T) {
	srv := setupSortableServer(t)

	tests := []struct {
		name  string
		query string
		want  []string
	}{
		{"cost desc", "sort=cost&order=desc", []string{"sess-b", "sess-c", "sess-a"}},
		{"cost asc", "sort=cost&order=asc", []string{"sess-a", "sess-c", "sess-b"}},
		{"tokens desc", "sort=tokens&order=desc", []string{"sess-a", "sess-c", "sess-b"}},
		{"date desc", "sort=date&order=desc", []string{"sess-c", "sess-b", "sess-a"}},
		{"date asc", "sort=date&order=asc", []string{"sess-a", "sess-b", "sess-c"}},
		{"name asc", "sort=name&order=asc", []string{"sess-a", "sess-b", "sess-c"}},
		{"default (no params) is date desc", "", []string{"sess-c", "sess-b", "sess-a"}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := pageOrder(t, srv, tt.query)
			if len(got) != len(tt.want) {
				t.Fatalf("got %v, want %v", got, tt.want)
			}
			for i := range tt.want {
				if got[i] != tt.want[i] {
					t.Errorf("position %d: got %s, want %s (full: %v)", i, got[i], tt.want[i], got)
				}
			}
		})
	}
}

// Sorting must order the whole result set, not just the visible page: paging
// through a cost-desc sort one row at a time must yield the global cost order.
func TestListSessionsSortAcrossPages(t *testing.T) {
	srv := setupSortableServer(t)

	want := []string{"sess-b", "sess-c", "sess-a"} // cost desc
	var got []string
	for offset := 0; offset < 3; offset++ {
		ids := pageOrder(t, srv, fmt.Sprintf("sort=cost&order=desc&limit=1&offset=%d", offset))
		got = append(got, ids...)
	}
	for i := range want {
		if got[i] != want[i] {
			t.Errorf("page offset %d: got %s, want %s (full: %v)", i, got[i], want[i], got)
		}
	}
}

// Aggregate token/cost totals cover the full filtered set, not just the page,
// so they share scope with the reported Total.
func TestListSessionsAggregateTotals(t *testing.T) {
	srv := setupSortableServer(t)

	// One-row page — totals must still reflect all three sessions.
	req := httptest.NewRequest("GET", "/api/sessions?limit=1", nil)
	w := httptest.NewRecorder()
	srv.mux.ServeHTTP(w, req)

	var page PaginatedSessionsResponse
	if err := json.NewDecoder(w.Body).Decode(&page); err != nil {
		t.Fatal(err)
	}
	if len(page.Sessions) != 1 {
		t.Fatalf("expected 1 session on page, got %d", len(page.Sessions))
	}
	if page.Total != 3 {
		t.Errorf("expected total 3, got %d", page.Total)
	}
	if page.TotalTokens != 900 { // 500 + 100 + 300
		t.Errorf("expected totalTokens 900, got %d", page.TotalTokens)
	}
	if page.TotalCost < 0.599 || page.TotalCost > 0.601 { // 0.10 + 0.30 + 0.20
		t.Errorf("expected totalCost ~0.60, got %g", page.TotalCost)
	}

	// Totals must respect filters: restricting to a higher timestamp drops sess-a.
	req = httptest.NewRequest("GET", "/api/sessions?from=1700000500000", nil)
	w = httptest.NewRecorder()
	srv.mux.ServeHTTP(w, req)
	if err := json.NewDecoder(w.Body).Decode(&page); err != nil {
		t.Fatal(err)
	}
	if page.Total != 2 {
		t.Errorf("expected total 2 after filter, got %d", page.Total)
	}
	if page.TotalTokens != 400 { // sess-b 100 + sess-c 300
		t.Errorf("expected filtered totalTokens 400, got %d", page.TotalTokens)
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
	if err := json.NewDecoder(w.Body).Decode(&cfg); err != nil {
		t.Fatal(err)
	}
	if cfg.ClaudeDir == "" {
		t.Error("expected non-empty claudeDir")
	}
	if cfg.Standalone {
		t.Error("expected standalone to be false")
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
	if err := json.NewDecoder(w.Body).Decode(&raw); err != nil {
		t.Fatal(err)
	}
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
	if err := json.NewDecoder(w.Body).Decode(&resp); err != nil {
		t.Fatal(err)
	}
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

func TestSearchEndpointWithProjectFilter(t *testing.T) {
	srv := newTestServerWithProjects(t)
	srv.index.Enrich(srv.claudeDir)

	// "hello world" exists in sess-1 (project-a). proj-1 includes project-a.
	req := httptest.NewRequest("GET", "/api/search?q=hello+world&project=proj-1", nil)
	w := httptest.NewRecorder()
	srv.mux.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}

	var resp SearchResponse
	if err := json.NewDecoder(w.Body).Decode(&resp); err != nil {
		t.Fatal(err)
	}
	if resp.Total != 1 {
		t.Fatalf("expected 1 result for proj-1, got %d", resp.Total)
	}
	if resp.Results[0].Session.ID != "sess-1" {
		t.Errorf("expected sess-1, got %s", resp.Results[0].Session.ID)
	}

	// "second session" exists in sess-2 (project-b). proj-1 only has project-a,
	// so searching within proj-1 should find no results.
	req = httptest.NewRequest("GET", "/api/search?q=second+session&project=proj-1", nil)
	w = httptest.NewRecorder()
	srv.mux.ServeHTTP(w, req)

	if err := json.NewDecoder(w.Body).Decode(&resp); err != nil {
		t.Fatal(err)
	}
	if resp.Total != 0 {
		t.Fatalf("expected 0 results for 'second session' in proj-1, got %d", resp.Total)
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
	if err := json.NewDecoder(w.Body).Decode(&resp); err != nil {
		t.Fatal(err)
	}

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
	if err := json.NewDecoder(w.Body).Decode(&resp); err != nil {
		t.Fatal(err)
	}

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

func newTestServerWithProjects(t *testing.T) *Server {
	t.Helper()
	dir := setupTestDir(t)
	projectsPath := filepath.Join(dir, "projects.json")
	projectsJSON := `[{"id":"proj-1","name":"Project A","folderPaths":["/users/me/project-a"]},{"id":"proj-2","name":"Both","folderPaths":["/users/me/project-a","/users/me/project-b"]}]`
	if err := os.WriteFile(projectsPath, []byte(projectsJSON), 0644); err != nil {
		t.Fatal(err)
	}
	srv, err := New(Config{ClaudeDir: dir, ProjectsPath: projectsPath})
	if err != nil {
		t.Fatalf("New() error: %v", err)
	}
	return srv
}

func TestListSessionsFilterByProject(t *testing.T) {
	srv := newTestServerWithProjects(t)

	// proj-1 has only project-a, should return 1 session.
	req := httptest.NewRequest("GET", "/api/sessions?project=proj-1", nil)
	w := httptest.NewRecorder()
	srv.mux.ServeHTTP(w, req)

	var page PaginatedSessionsResponse
	if err := json.NewDecoder(w.Body).Decode(&page); err != nil {
		t.Fatal(err)
	}
	if len(page.Sessions) != 1 {
		t.Fatalf("expected 1 session, got %d", len(page.Sessions))
	}
	if page.Sessions[0].ID != "sess-1" {
		t.Errorf("expected sess-1, got %s", page.Sessions[0].ID)
	}

	// proj-2 has both dirs, should return 2 sessions.
	req = httptest.NewRequest("GET", "/api/sessions?project=proj-2", nil)
	w = httptest.NewRecorder()
	srv.mux.ServeHTTP(w, req)

	if err := json.NewDecoder(w.Body).Decode(&page); err != nil {
		t.Fatal(err)
	}
	if len(page.Sessions) != 2 {
		t.Fatalf("expected 2 sessions for proj-2, got %d", len(page.Sessions))
	}
}

func TestListSessionsFilterByProjectAndDir(t *testing.T) {
	srv := newTestServerWithProjects(t)

	// proj-2 has both dirs, but secondary dir filter narrows to project-a only.
	req := httptest.NewRequest("GET", "/api/sessions?project=proj-2&dir=project-a", nil)
	w := httptest.NewRecorder()
	srv.mux.ServeHTTP(w, req)

	var page PaginatedSessionsResponse
	if err := json.NewDecoder(w.Body).Decode(&page); err != nil {
		t.Fatal(err)
	}
	if len(page.Sessions) != 1 {
		t.Fatalf("expected 1 session, got %d", len(page.Sessions))
	}
	if page.Sessions[0].ID != "sess-1" {
		t.Errorf("expected sess-1, got %s", page.Sessions[0].ID)
	}
}

func TestListSessionsFilterByUnknownProject(t *testing.T) {
	srv := newTestServerWithProjects(t)

	// Unknown project ID should return all sessions (no filtering).
	req := httptest.NewRequest("GET", "/api/sessions?project=nonexistent", nil)
	w := httptest.NewRecorder()
	srv.mux.ServeHTTP(w, req)

	var page PaginatedSessionsResponse
	if err := json.NewDecoder(w.Body).Decode(&page); err != nil {
		t.Fatal(err)
	}
	if len(page.Sessions) != 2 {
		t.Fatalf("expected 2 sessions for unknown project, got %d", len(page.Sessions))
	}
}

func TestActivityEndpointWithProjectFilter(t *testing.T) {
	srv := newTestServerWithProjects(t)

	req := httptest.NewRequest("GET", "/api/activity?project=proj-1", nil)
	w := httptest.NewRecorder()
	srv.mux.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}

	var resp ActivityResponse
	if err := json.NewDecoder(w.Body).Decode(&resp); err != nil {
		t.Fatal(err)
	}

	// Dirs should be scoped to project-a only.
	if len(resp.Dirs) != 1 {
		t.Errorf("expected 1 dir for proj-1, got %d: %v", len(resp.Dirs), resp.Dirs)
	}

	// Day counts should only reflect project-a sessions.
	totalCount := 0
	for _, d := range resp.Days {
		totalCount += d.Count
	}
	if totalCount != 1 {
		t.Errorf("expected 1 session day count for proj-1, got %d", totalCount)
	}
}

func TestCORSAllowsIPv6Origin(t *testing.T) {
	srv := newTestServer(t)
	handler := corsHandler(3000, nil, srv.mux)

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
	handler := corsHandler(3000, nil, srv.mux)

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
	handler := corsHandler(3000, nil, srv.mux)

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
	if err := json.NewDecoder(w.Body).Decode(&initial); err != nil {
		t.Fatal(err)
	}
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
	if err := json.NewDecoder(w.Body).Decode(&projects); err != nil {
		t.Fatal(err)
	}
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

// --- Token auth middleware tests ---

func TestTokenAuthSkipsNonAPIRoutes(t *testing.T) {
	inner := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})
	handler := tokenAuthMiddleware("secret-token", inner)

	// Static assets should not require auth.
	req := httptest.NewRequest("GET", "/assets/index-BhKbx81Y.js", nil)
	w := httptest.NewRecorder()
	handler.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200 for static asset without token, got %d", w.Code)
	}

	// Root path should not require auth.
	req = httptest.NewRequest("GET", "/", nil)
	w = httptest.NewRecorder()
	handler.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200 for root path without token, got %d", w.Code)
	}
}

func TestTokenAuthRejectsQueryParam(t *testing.T) {
	// The query-param path was removed so the token never lives in a URL; a
	// token supplied only via ?token= must now be rejected.
	inner := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})
	handler := tokenAuthMiddleware("secret-token", inner)

	req := httptest.NewRequest("GET", "/api/health?token=secret-token", nil)
	w := httptest.NewRecorder()
	handler.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401 for query-param token, got %d", w.Code)
	}
}

func TestTokenAuthViaStreamCookie(t *testing.T) {
	inner := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})
	handler := tokenAuthMiddleware("secret-token", inner)

	req := httptest.NewRequest("GET", "/api/sessions/sess-1/stream", nil)
	req.AddCookie(&http.Cookie{Name: streamAuthCookie, Value: "secret-token"})
	w := httptest.NewRecorder()
	handler.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200 with valid stream cookie, got %d", w.Code)
	}
}

func TestTokenAuthRejectsWrongStreamCookie(t *testing.T) {
	inner := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})
	handler := tokenAuthMiddleware("secret-token", inner)

	req := httptest.NewRequest("GET", "/api/sessions/sess-1/stream", nil)
	req.AddCookie(&http.Cookie{Name: streamAuthCookie, Value: "wrong-token"})
	w := httptest.NewRecorder()
	handler.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401 with wrong stream cookie, got %d", w.Code)
	}
}

func TestTokenAuthStreamHandshakeSetsCookie(t *testing.T) {
	// A header-authenticated handshake hands back the HttpOnly cookie that
	// authorizes the SSE stream without a token in the URL.
	s := &Server{token: "secret-token"}
	req := httptest.NewRequest("POST", "/api/auth/stream", nil)
	w := httptest.NewRecorder()
	s.handleAuthStream(w, req)

	if w.Code != http.StatusNoContent {
		t.Fatalf("expected 204, got %d", w.Code)
	}
	var cookie *http.Cookie
	for _, c := range w.Result().Cookies() {
		if c.Name == streamAuthCookie {
			cookie = c
		}
	}
	if cookie == nil {
		t.Fatal("expected stream auth cookie to be set")
	}
	if cookie.Value != "secret-token" {
		t.Errorf("expected cookie value to match token, got %q", cookie.Value)
	}
	if !cookie.HttpOnly {
		t.Error("expected stream auth cookie to be HttpOnly")
	}
	if cookie.SameSite != http.SameSiteStrictMode {
		t.Error("expected stream auth cookie to be SameSite=Strict")
	}
}

func TestTokensEqualConstantTime(t *testing.T) {
	if !tokensEqual("abc123", "abc123") {
		t.Error("expected equal tokens to compare true")
	}
	if tokensEqual("abc123", "abc124") {
		t.Error("expected different tokens to compare false")
	}
	if tokensEqual("abc123", "abc1234") {
		t.Error("expected tokens of different length to compare false")
	}
	if tokensEqual("", "secret") {
		t.Error("expected empty token to compare false against a real token")
	}
}

func TestTokenAuthViaBearerHeader(t *testing.T) {
	inner := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})
	handler := tokenAuthMiddleware("secret-token", inner)

	req := httptest.NewRequest("GET", "/api/health", nil)
	req.Header.Set("Authorization", "Bearer secret-token")
	w := httptest.NewRecorder()
	handler.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200 with valid bearer token, got %d", w.Code)
	}
}

func TestTokenAuthRejectsMissingToken(t *testing.T) {
	inner := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})
	handler := tokenAuthMiddleware("secret-token", inner)

	req := httptest.NewRequest("GET", "/api/health", nil)
	w := httptest.NewRecorder()
	handler.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401 without token, got %d", w.Code)
	}
}

func TestTokenAuthRejectsWrongToken(t *testing.T) {
	inner := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})
	handler := tokenAuthMiddleware("secret-token", inner)

	req := httptest.NewRequest("GET", "/api/health", nil)
	req.Header.Set("Authorization", "Bearer wrong-token")
	w := httptest.NewRecorder()
	handler.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401 with wrong bearer token, got %d", w.Code)
	}
}

// --- LAN CORS tests ---

func TestCORSAllowsExplicitLANOrigin(t *testing.T) {
	srv := newTestServer(t)
	handler := corsHandler(4880, []string{"http://192.168.1.5:4880"}, srv.mux)

	req := httptest.NewRequest("GET", "/api/health", nil)
	req.Header.Set("Origin", "http://192.168.1.5:4880")
	w := httptest.NewRecorder()
	handler.ServeHTTP(w, req)

	if got := w.Header().Get("Access-Control-Allow-Origin"); got != "http://192.168.1.5:4880" {
		t.Errorf("expected LAN origin allowed, got %q", got)
	}
}

func TestCORSRejectsUnlistedLANOrigin(t *testing.T) {
	srv := newTestServer(t)
	handler := corsHandler(4880, nil, srv.mux)

	req := httptest.NewRequest("GET", "/api/health", nil)
	req.Header.Set("Origin", "http://192.168.1.5:4880")
	w := httptest.NewRecorder()
	handler.ServeHTTP(w, req)

	if got := w.Header().Get("Access-Control-Allow-Origin"); got != "" {
		t.Errorf("expected LAN origin rejected without LAN mode, got %q", got)
	}
}

func TestCORSRejectsUnlistedPublicIP(t *testing.T) {
	srv := newTestServer(t)
	handler := corsHandler(4880, []string{"http://192.168.1.5:4880"}, srv.mux)

	req := httptest.NewRequest("GET", "/api/health", nil)
	req.Header.Set("Origin", "http://8.8.8.8:4880")
	w := httptest.NewRecorder()
	handler.ServeHTTP(w, req)

	if got := w.Header().Get("Access-Control-Allow-Origin"); got != "" {
		t.Errorf("expected public IP rejected in LAN mode, got %q", got)
	}
}

func TestCORSAllowsAuthorizationHeader(t *testing.T) {
	srv := newTestServer(t)
	handler := corsHandler(4880, []string{"http://192.168.1.5:4880"}, srv.mux)

	req := httptest.NewRequest("OPTIONS", "/api/sessions", nil)
	req.Header.Set("Origin", "http://192.168.1.5:4880")
	w := httptest.NewRecorder()
	handler.ServeHTTP(w, req)

	allowHeaders := w.Header().Get("Access-Control-Allow-Headers")
	if !strings.Contains(allowHeaders, "Authorization") {
		t.Errorf("expected Authorization in allowed headers, got %q", allowHeaders)
	}
}
