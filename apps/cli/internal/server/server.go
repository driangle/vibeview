// Package server implements the HTTP API server for VibeView.
package server

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/driangle/vibeview/internal/claude"
	"github.com/driangle/vibeview/internal/session"
	"github.com/driangle/vibeview/internal/spa"
	"github.com/driangle/vibeview/internal/watcher"
)

// Config holds the configuration for creating a Server.
type Config struct {
	ClaudeDir  string
	Index      *session.Index // Pre-built index (for standalone mode).
	Standalone bool           // True when viewing standalone files (no ~/.claude).
	Paths      []string       // Explicit file/directory paths (standalone mode).
}

// Server serves the VibeView HTTP API.
type Server struct {
	claudeDir  string
	standalone bool
	paths      []string
	index      *session.Index
	broker     *watcher.Broker
	mux        *http.ServeMux
}

// New creates a Server. In standalone mode, it uses the provided Index directly.
// Otherwise, it discovers sessions from claudeDir and enriches them before serving.
func New(cfg Config) (*Server, error) {
	idx := cfg.Index
	if idx == nil {
		var err error
		idx, err = session.Discover(cfg.ClaudeDir)
		if err != nil {
			return nil, fmt.Errorf("discover sessions: %w", err)
		}
	}

	broker, err := watcher.NewBroker(cfg.ClaudeDir, idx, cfg.Standalone)
	if err != nil {
		return nil, fmt.Errorf("start broker: %w", err)
	}

	s := &Server{
		claudeDir:  cfg.ClaudeDir,
		standalone: cfg.Standalone,
		paths:      cfg.Paths,
		index:      idx,
		broker:     broker,
		mux:        http.NewServeMux(),
	}
	s.routes()

	if !cfg.Standalone {
		// Enrich the first page synchronously so it's ready on first load,
		// then continue enriching the rest in the background.
		idx.EnrichN(cfg.ClaudeDir, 100)
		go idx.Enrich(cfg.ClaudeDir)
	}

	return s, nil
}

func (s *Server) routes() {
	s.mux.HandleFunc("GET /api/config", s.handleConfig)
	s.mux.HandleFunc("GET /api/health", s.handleHealth)
	s.mux.HandleFunc("GET /api/pricing", s.handlePricing)
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

func (s *Server) handleConfig(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, ConfigResponse{
		ClaudeDir:  s.claudeDir,
		Standalone: s.standalone,
		Paths:      s.paths,
	})
}

func (s *Server) handleHealth(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (s *Server) handlePricing(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write(claude.GetPricingJSON())
}

func (s *Server) handleListSessions(w http.ResponseWriter, r *http.Request) {
	sessions := s.index.GetSessions()
	if project := r.URL.Query().Get("project"); project != "" {
		filtered := make([]session.SessionMeta, 0)
		for _, sm := range sessions {
			if strings.Contains(sm.Project, project) {
				filtered = append(filtered, sm)
			}
		}
		sessions = filtered
	}

	if model := r.URL.Query().Get("model"); model != "" {
		filtered := make([]session.SessionMeta, 0)
		for _, sm := range sessions {
			if sm.Model == model {
				filtered = append(filtered, sm)
			}
		}
		sessions = filtered
	}

	if q := r.URL.Query().Get("q"); q != "" {
		query := strings.ToLower(q)
		filtered := make([]session.SessionMeta, 0)
		for _, sm := range sessions {
			if strings.Contains(strings.ToLower(sm.Project), query) ||
				strings.Contains(strings.ToLower(sm.Slug), query) ||
				strings.Contains(strings.ToLower(sm.CustomTitle), query) {
				filtered = append(filtered, sm)
			}
		}
		sessions = filtered
	}

	if fromStr := r.URL.Query().Get("from"); fromStr != "" {
		if fromMs, err := strconv.ParseInt(fromStr, 10, 64); err == nil {
			filtered := make([]session.SessionMeta, 0)
			for _, sm := range sessions {
				if sm.Timestamp >= fromMs {
					filtered = append(filtered, sm)
				}
			}
			sessions = filtered
		}
	}
	if toStr := r.URL.Query().Get("to"); toStr != "" {
		if toMs, err := strconv.ParseInt(toStr, 10, 64); err == nil {
			filtered := make([]session.SessionMeta, 0)
			for _, sm := range sessions {
				if sm.Timestamp <= toMs {
					filtered = append(filtered, sm)
				}
			}
			sessions = filtered
		}
	}

	total := len(sessions)

	// Apply limit/offset pagination.
	if limitStr := r.URL.Query().Get("limit"); limitStr != "" {
		limit, err := strconv.Atoi(limitStr)
		if err == nil && limit > 0 {
			offset := 0
			if offsetStr := r.URL.Query().Get("offset"); offsetStr != "" {
				if o, err := strconv.Atoi(offsetStr); err == nil && o > 0 {
					offset = o
				}
			}
			if offset >= len(sessions) {
				sessions = nil
			} else {
				end := offset + limit
				if end > len(sessions) {
					end = len(sessions)
				}
				sessions = sessions[offset:end]
			}
		}
	}

	resp := make([]SessionResponse, 0, len(sessions))
	for _, m := range sessions {
		resp = append(resp, toSessionResponse(m))
	}
	writeJSON(w, http.StatusOK, PaginatedSessionsResponse{
		Sessions: resp,
		Total:    total,
	})
}

func (s *Server) handleGetSession(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")

	meta := s.index.FindSession(id)
	if meta == nil {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "session not found"})
		return
	}

	path := session.ResolveFilePath(s.claudeDir, *meta)
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
		FilePath:        path,
		Messages:        msgResponses,
	}
	writeJSON(w, http.StatusOK, resp)
}

func (s *Server) handleSessionStream(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")

	if s.index.FindSession(id) == nil {
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

	client, err := s.broker.Subscribe(id)
	if err != nil {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "session file not found"})
		return
	}
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

// ConfigResponse is the API representation of the server configuration.
type ConfigResponse struct {
	ClaudeDir  string   `json:"claudeDir"`
	Standalone bool     `json:"standalone"`
	Paths      []string `json:"paths,omitempty"`
}

// SessionResponse is the API representation of a session in list responses.
type SessionResponse struct {
	ID           string              `json:"id"`
	Project      string              `json:"project"`
	CustomTitle  string              `json:"customTitle"`
	Timestamp    string              `json:"timestamp"`
	MessageCount int                 `json:"messageCount"`
	Model        string              `json:"model"`
	Slug         string              `json:"slug"`
	Usage        session.UsageTotals `json:"usage"`
}

// PaginatedSessionsResponse wraps a page of sessions with the total count.
type PaginatedSessionsResponse struct {
	Sessions []SessionResponse `json:"sessions"`
	Total    int               `json:"total"`
}

// SessionDetailResponse is the API representation of a single session with messages.
type SessionDetailResponse struct {
	SessionResponse
	FilePath string            `json:"filePath"`
	Messages []MessageResponse `json:"messages"`
}

// MessageResponse is the API representation of a single message.
type MessageResponse struct {
	UUID      string             `json:"uuid"`
	Type      string             `json:"type"`
	Timestamp string             `json:"timestamp"`
	Message   *claude.APIMessage `json:"message,omitempty"`
	Data      map[string]any     `json:"data,omitempty"`
	Snapshot  map[string]any     `json:"snapshot,omitempty"`
}

// --- Helpers ---

func toSessionResponse(m session.SessionMeta) SessionResponse {
	return SessionResponse{
		ID:           m.SessionID,
		Project:      m.Project,
		CustomTitle:  m.CustomTitle,
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
		Timestamp: msToISO(msg.Timestamp.Int64()),
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
