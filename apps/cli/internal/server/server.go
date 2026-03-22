// Package server implements the HTTP API server for VibeView.
package server

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/driangle/vibeview/internal/claude"
	"github.com/driangle/vibeview/internal/search"
	"github.com/driangle/vibeview/internal/session"
	"github.com/driangle/vibeview/internal/settings"
	"github.com/driangle/vibeview/internal/spa"
	"github.com/driangle/vibeview/internal/watcher"
)

// Config holds the configuration for creating a Server.
type Config struct {
	ClaudeDir    string
	Index        *session.Index // Pre-built index (for standalone mode).
	Standalone   bool           // True when viewing standalone files (no ~/.claude).
	Paths        []string       // Explicit file/directory paths (standalone mode).
	Dirs         []string       // Filter to these project directory names (under ~/.claude/projects/).
	SettingsPath string         // Path to the settings JSON file.
}

// Server serves the VibeView HTTP API.
type Server struct {
	claudeDir    string
	standalone   bool
	paths        []string
	dirs         []string
	settingsPath string
	index        *session.Index
	broker       *watcher.Broker
	mux          *http.ServeMux
	httpServer   *http.Server
}

// New creates a Server. In standalone mode, it uses the provided Index directly.
// Otherwise, it discovers sessions from claudeDir and enriches them before serving.
func New(cfg Config) (*Server, error) {
	idx := cfg.Index
	if idx == nil {
		var err error
		idx, err = session.Discover(cfg.ClaudeDir, cfg.Dirs)
		if err != nil {
			return nil, fmt.Errorf("discover sessions: %w", err)
		}
	}

	broker, err := watcher.NewBroker(cfg.ClaudeDir, idx, cfg.Standalone, cfg.Dirs)
	if err != nil {
		return nil, fmt.Errorf("start broker: %w", err)
	}

	s := &Server{
		claudeDir:    cfg.ClaudeDir,
		standalone:   cfg.Standalone,
		paths:        cfg.Paths,
		dirs:         cfg.Dirs,
		settingsPath: cfg.SettingsPath,
		index:        idx,
		broker:       broker,
		mux:          http.NewServeMux(),
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
	s.mux.HandleFunc("GET /api/settings", s.handleGetSettings)
	s.mux.HandleFunc("PUT /api/settings", s.handleUpdateSettings)
	s.mux.HandleFunc("GET /api/sessions", s.handleListSessions)
	s.mux.HandleFunc("GET /api/sessions/{id}/stream", s.handleSessionStream)
	s.mux.HandleFunc("GET /api/sessions/{id}", s.handleGetSession)
	s.mux.HandleFunc("GET /api/activity", s.handleActivity)
	s.mux.HandleFunc("GET /api/search", s.handleSearch)

	// Serve embedded SPA for all other routes.
	s.mux.Handle("/", spa.Handler())
}

// ListenAndServe starts the HTTP server on the given port.
func (s *Server) ListenAndServe(port int) error {
	addr := fmt.Sprintf(":%d", port)
	s.httpServer = &http.Server{Addr: addr, Handler: cors(s.mux)}
	return s.httpServer.ListenAndServe()
}

// Shutdown gracefully stops the HTTP server and cleans up resources.
func (s *Server) Shutdown(ctx context.Context) error {
	s.broker.Close()
	return s.httpServer.Shutdown(ctx)
}

// cors wraps a handler with permissive CORS headers for local development.
func cors(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, PUT, OPTIONS")
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
		Dirs:       s.dirs,
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

func (s *Server) handleGetSettings(w http.ResponseWriter, r *http.Request) {
	current, err := settings.Load(s.settingsPath)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, current)
}

func (s *Server) handleUpdateSettings(w http.ResponseWriter, r *http.Request) {
	body, err := io.ReadAll(r.Body)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "failed to read body"})
		return
	}

	current, err := settings.Load(s.settingsPath)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}

	merged, err := settings.MergeJSON(current, body)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}

	if err := settings.Save(s.settingsPath, merged); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}

	writeJSON(w, http.StatusOK, merged)
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

	if state := r.URL.Query().Get("activityState"); state != "" {
		filtered := make([]session.SessionMeta, 0)
		for _, sm := range sessions {
			if sm.ActivityState == state {
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

func (s *Server) handleSearch(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query().Get("q")
	if q == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "q parameter is required"})
		return
	}

	limit := 20
	if limitStr := r.URL.Query().Get("limit"); limitStr != "" {
		if n, err := strconv.Atoi(limitStr); err == nil && n > 0 {
			limit = n
		}
	}
	if limit > 100 {
		limit = 100
	}

	results := search.Search(r.Context(), s.index, search.Options{
		Query:     q,
		Limit:     limit,
		ClaudeDir: s.claudeDir,
	})

	resp := SearchResponse{
		Results: make([]SearchResultResponse, 0, len(results)),
		Total:   len(results),
	}
	for _, r := range results {
		resp.Results = append(resp.Results, SearchResultResponse{
			Session: toSessionResponse(r.Meta),
			Snippet: r.Snippet,
		})
	}
	writeJSON(w, http.StatusOK, resp)
}

func (s *Server) handleActivity(w http.ResponseWriter, r *http.Request) {
	allSessions := s.index.GetSessions()

	// Always build the full projects list so the filter dropdown stays visible.
	projectSet := make(map[string]struct{})
	for _, sm := range allSessions {
		if sm.Project != "" {
			projectSet[sm.Project] = struct{}{}
		}
	}
	projects := make([]string, 0, len(projectSet))
	for p := range projectSet {
		projects = append(projects, p)
	}
	sort.Strings(projects)

	// Apply project filter only for day counts.
	sessions := allSessions
	if project := r.URL.Query().Get("project"); project != "" {
		filtered := make([]session.SessionMeta, 0)
		for _, sm := range sessions {
			if strings.Contains(sm.Project, project) {
				filtered = append(filtered, sm)
			}
		}
		sessions = filtered
	}

	dayCounts := make(map[string]int)
	for _, sm := range sessions {
		if sm.Timestamp == 0 {
			continue
		}
		day := time.UnixMilli(sm.Timestamp).UTC().Format("2006-01-02")
		dayCounts[day]++
	}

	days := make([]ActivityDayResponse, 0, len(dayCounts))
	for date, count := range dayCounts {
		days = append(days, ActivityDayResponse{Date: date, Count: count})
	}
	sort.Slice(days, func(i, j int) bool { return days[i].Date < days[j].Date })

	writeJSON(w, http.StatusOK, ActivityResponse{Days: days, Projects: projects})
}

// --- Response Types ---

// ConfigResponse is the API representation of the server configuration.
type ConfigResponse struct {
	ClaudeDir  string   `json:"claudeDir"`
	Standalone bool     `json:"standalone"`
	Paths      []string `json:"paths,omitempty"`
	Dirs       []string `json:"dirs,omitempty"`
}

// ActivityDayResponse is a single day's session count.
type ActivityDayResponse struct {
	Date  string `json:"date"`
	Count int    `json:"count"`
}

// ActivityResponse is the API representation of daily activity data.
type ActivityResponse struct {
	Days     []ActivityDayResponse `json:"days"`
	Projects []string              `json:"projects"`
}

// SessionResponse is the API representation of a session in list responses.
type SessionResponse struct {
	ID            string              `json:"id"`
	Project       string              `json:"project"`
	CustomTitle   string              `json:"customTitle"`
	Timestamp     string              `json:"timestamp"`
	MessageCount  int                 `json:"messageCount"`
	Model         string              `json:"model"`
	Slug          string              `json:"slug"`
	Usage         session.UsageTotals `json:"usage"`
	ActivityState string              `json:"activityState"`
}

// PaginatedSessionsResponse wraps a page of sessions with the total count.
type PaginatedSessionsResponse struct {
	Sessions []SessionResponse `json:"sessions"`
	Total    int               `json:"total"`
}

// SearchResultResponse is a single content search result.
type SearchResultResponse struct {
	Session SessionResponse `json:"session"`
	Snippet string          `json:"snippet"`
}

// SearchResponse wraps content search results.
type SearchResponse struct {
	Results []SearchResultResponse `json:"results"`
	Total   int                    `json:"total"`
}

// SessionDetailResponse is the API representation of a single session with messages.
type SessionDetailResponse struct {
	SessionResponse
	FilePath string            `json:"filePath"`
	Messages []MessageResponse `json:"messages"`
}

// MessageResponse is the API representation of a single message.
type MessageResponse struct {
	UUID        string             `json:"uuid"`
	Type        string             `json:"type"`
	Timestamp   string             `json:"timestamp"`
	Message     *claude.APIMessage `json:"message,omitempty"`
	Content     string             `json:"content,omitempty"`
	Data        map[string]any     `json:"data,omitempty"`
	Snapshot    map[string]any     `json:"snapshot,omitempty"`
	CustomTitle string             `json:"customTitle,omitempty"`
}

// --- Helpers ---

func toSessionResponse(m session.SessionMeta) SessionResponse {
	return SessionResponse{
		ID:            m.SessionID,
		Project:       m.Project,
		CustomTitle:   m.CustomTitle,
		Timestamp:     msToISO(m.Timestamp),
		MessageCount:  m.MessageCount,
		Model:         m.Model,
		Slug:          m.Slug,
		Usage:         m.Usage,
		ActivityState: m.ActivityState,
	}
}

func toMessageResponse(msg claude.Message) MessageResponse {
	return MessageResponse{
		UUID:        msg.UUID,
		Type:        string(msg.Type),
		Timestamp:   msToISO(msg.Timestamp.Int64()),
		Message:     msg.Message,
		Content:     msg.Content,
		Data:        msg.Data,
		Snapshot:    msg.Snapshot,
		CustomTitle: msg.CustomTitle,
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
