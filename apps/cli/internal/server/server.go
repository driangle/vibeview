// Package server implements the HTTP API server for VibeView.
package server

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"time"

	"github.com/driangle/vibeview/internal/claude"
	"github.com/driangle/vibeview/internal/session"
	"github.com/driangle/vibeview/internal/spa"
	"github.com/driangle/vibeview/internal/watcher"
)

// Server serves the VibeView HTTP API.
type Server struct {
	claudeDir string
	index     *session.Index
	broker    *watcher.Broker
	mux       *http.ServeMux
}

// New creates a Server by discovering all sessions in claudeDir.
func New(claudeDir string) (*Server, error) {
	idx, err := session.Discover(claudeDir)
	if err != nil {
		return nil, fmt.Errorf("discover sessions: %w", err)
	}

	broker, err := watcher.NewBroker(claudeDir, idx)
	if err != nil {
		return nil, fmt.Errorf("start broker: %w", err)
	}

	s := &Server{
		claudeDir: claudeDir,
		index:     idx,
		broker:    broker,
		mux:       http.NewServeMux(),
	}
	s.routes()
	return s, nil
}

func (s *Server) routes() {
	s.mux.HandleFunc("GET /api/health", s.handleHealth)
	s.mux.HandleFunc("GET /api/sessions", s.handleListSessions)
	s.mux.HandleFunc("GET /api/sessions/{id}/stream", s.handleSessionStream)
	s.mux.HandleFunc("GET /api/sessions/{id}", s.handleGetSession)

	// Serve embedded SPA for all other routes.
	s.mux.Handle("/", spa.Handler())
}

// ListenAndServe starts the HTTP server on the given port.
func (s *Server) ListenAndServe(port int) error {
	addr := fmt.Sprintf(":%d", port)
	return http.ListenAndServe(addr, cors(s.mux))
}

// cors wraps a handler with permissive CORS headers for local development.
func cors(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

// --- Handlers ---

func (s *Server) handleHealth(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (s *Server) handleListSessions(w http.ResponseWriter, r *http.Request) {
	sessions := s.index.Sessions
	if project := r.URL.Query().Get("project"); project != "" {
		sessions = s.index.FilterByProject(project)
	}

	resp := make([]SessionResponse, 0, len(sessions))
	for _, m := range sessions {
		resp = append(resp, toSessionResponse(m))
	}
	writeJSON(w, http.StatusOK, resp)
}

func (s *Server) handleGetSession(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")

	var meta *session.SessionMeta
	for i := range s.index.Sessions {
		if s.index.Sessions[i].SessionID == id {
			meta = &s.index.Sessions[i]
			break
		}
	}
	if meta == nil {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "session not found"})
		return
	}

	path := session.SessionFilePath(s.claudeDir, meta.Project, meta.SessionID)
	f, err := os.Open(path)
	if err != nil {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "session file not found"})
		return
	}
	defer f.Close()

	messages, err := claude.ParseSessionFile(f)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to parse session"})
		return
	}

	msgResponses := make([]MessageResponse, 0, len(messages))
	for _, msg := range messages {
		msgResponses = append(msgResponses, toMessageResponse(msg))
	}

	resp := SessionDetailResponse{
		SessionResponse: toSessionResponse(*meta),
		Messages:        msgResponses,
	}
	writeJSON(w, http.StatusOK, resp)
}

func (s *Server) handleSessionStream(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")

	// Verify session exists.
	found := false
	for i := range s.index.Sessions {
		if s.index.Sessions[i].SessionID == id {
			found = true
			break
		}
	}
	if !found {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "session not found"})
		return
	}

	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "streaming not supported", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.WriteHeader(http.StatusOK)
	flusher.Flush()

	client := s.broker.Subscribe(id)
	defer s.broker.Unsubscribe(client)

	ctx := r.Context()
	for {
		select {
		case <-ctx.Done():
			return
		case event, ok := <-client.Events:
			if !ok {
				return
			}
			fmt.Fprintf(w, "event: %s\ndata: %s\n\n", event.Event, event.Data)
			flusher.Flush()
		}
	}
}

// --- Response Types ---

// SessionResponse is the API representation of a session in list responses.
type SessionResponse struct {
	ID           string              `json:"id"`
	Project      string              `json:"project"`
	Display      string              `json:"display"`
	Timestamp    string              `json:"timestamp"`
	MessageCount int                 `json:"messageCount"`
	Model        string              `json:"model"`
	Slug         string              `json:"slug"`
	Usage        session.UsageTotals `json:"usage"`
}

// SessionDetailResponse is the API representation of a single session with messages.
type SessionDetailResponse struct {
	SessionResponse
	Messages []MessageResponse `json:"messages"`
}

// MessageResponse is the API representation of a single message.
type MessageResponse struct {
	UUID      string              `json:"uuid"`
	Type      string              `json:"type"`
	Timestamp string              `json:"timestamp"`
	Message   *claude.APIMessage  `json:"message,omitempty"`
	Data      map[string]any      `json:"data,omitempty"`
	Snapshot  map[string]any      `json:"snapshot,omitempty"`
}

// --- Helpers ---

func toSessionResponse(m session.SessionMeta) SessionResponse {
	return SessionResponse{
		ID:           m.SessionID,
		Project:      m.Project,
		Display:      m.Display,
		Timestamp:    msToISO(m.Timestamp),
		MessageCount: m.MessageCount,
		Model:        m.Model,
		Slug:         m.Slug,
		Usage:        m.Usage,
	}
}

func toMessageResponse(msg claude.Message) MessageResponse {
	return MessageResponse{
		UUID:      msg.UUID,
		Type:      string(msg.Type),
		Timestamp: msToISO(msg.Timestamp),
		Message:   msg.Message,
		Data:      msg.Data,
		Snapshot:  msg.Snapshot,
	}
}

func msToISO(ms int64) string {
	if ms == 0 {
		return ""
	}
	return time.UnixMilli(ms).UTC().Format(time.RFC3339)
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}
