package server

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"
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
{"type":"assistant","uuid":"a1","sessionId":"sess-1","timestamp":1700000001000,"message":{"role":"assistant","model":"claude-sonnet-4-20250514","content":[{"type":"text","text":"Hi there!"}],"usage":{"input_tokens":10,"output_tokens":5}}}
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
	srv, err := New(dir)
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

	var sessions []SessionResponse
	json.NewDecoder(w.Body).Decode(&sessions)
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

func TestListSessionsFilterByProject(t *testing.T) {
	srv := newTestServer(t)
	req := httptest.NewRequest("GET", "/api/sessions?project=project-a", nil)
	w := httptest.NewRecorder()
	srv.mux.ServeHTTP(w, req)

	var sessions []SessionResponse
	json.NewDecoder(w.Body).Decode(&sessions)
	if len(sessions) != 1 {
		t.Fatalf("expected 1 session, got %d", len(sessions))
	}
	if sessions[0].ID != "sess-1" {
		t.Errorf("expected sess-1, got %s", sessions[0].ID)
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

func TestCORSHeaders(t *testing.T) {
	srv := newTestServer(t)
	handler := cors(srv.mux)

	req := httptest.NewRequest("GET", "/api/health", nil)
	w := httptest.NewRecorder()
	handler.ServeHTTP(w, req)

	if got := w.Header().Get("Access-Control-Allow-Origin"); got != "*" {
		t.Errorf("expected CORS origin *, got %q", got)
	}
}

func TestCORSPreflight(t *testing.T) {
	srv := newTestServer(t)
	handler := cors(srv.mux)

	req := httptest.NewRequest("OPTIONS", "/api/sessions", nil)
	w := httptest.NewRecorder()
	handler.ServeHTTP(w, req)

	if w.Code != http.StatusNoContent {
		t.Errorf("expected 204 for OPTIONS, got %d", w.Code)
	}
}

func TestSessionResponseUsesIDNotSessionID(t *testing.T) {
	srv := newTestServer(t)
	req := httptest.NewRequest("GET", "/api/sessions", nil)
	w := httptest.NewRecorder()
	srv.mux.ServeHTTP(w, req)

	// Verify raw JSON uses "id" not "sessionId".
	var raw []map[string]any
	json.NewDecoder(w.Body).Decode(&raw)
	for _, s := range raw {
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
	req := httptest.NewRequest("GET", "/api/sessions?project=nonexistent", nil)
	w := httptest.NewRecorder()
	srv.mux.ServeHTTP(w, req)

	var sessions []SessionResponse
	json.NewDecoder(w.Body).Decode(&sessions)
	if sessions == nil {
		t.Error("expected empty array, got null")
	}
	if len(sessions) != 0 {
		fmt.Printf("sessions: %v\n", sessions)
		t.Errorf("expected 0 sessions, got %d", len(sessions))
	}
}
