// Package server implements the HTTP API server for vibeview.
package server

import (
	"context"
	"crypto/subtle"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/driangle/vibeview/apps/lib/claude"
	"github.com/driangle/vibeview/apps/lib/insights"
	"github.com/driangle/vibeview/apps/lib/messagedto"
	"github.com/driangle/vibeview/apps/lib/pathutil"
	"github.com/driangle/vibeview/apps/lib/redact"
	"github.com/driangle/vibeview/apps/lib/search"
	"github.com/driangle/vibeview/apps/lib/session"
	"github.com/driangle/vibeview/apps/lib/timeline"
	"github.com/driangle/vibeview/internal/pidcheck"
	"github.com/driangle/vibeview/internal/projects"
	"github.com/driangle/vibeview/internal/settings"
	"github.com/driangle/vibeview/internal/spa"
	"github.com/driangle/vibeview/internal/watcher"
)

// Config holds the configuration for creating a Server.
type Config struct {
	ClaudeDir      string
	Index          *session.Index // Pre-built index (for standalone mode).
	Standalone     bool           // True when viewing standalone files (no ~/.claude).
	Paths          []string       // Explicit file/directory paths (standalone mode).
	Dirs           []string       // Filter to these project directory names (under ~/.claude/projects/).
	SettingsPath   string         // Path to the settings JSON file.
	ProjectsPath   string         // Path to the projects JSON file.
	Host           string         // Bind address (default "127.0.0.1", "0.0.0.0" for LAN mode).
	Token          string         // Access token for LAN mode (empty disables auth).
	AllowedOrigins []string       // Additional exact origins allowed by CORS.
}

// Server serves the vibeview HTTP API.
type Server struct {
	claudeDir      string
	standalone     bool
	paths          []string
	dirs           []string
	settingsPath   string
	projectsPath   string
	host           string
	token          string
	allowedOrigins []string
	index          *session.Index
	broker         *watcher.Broker
	mux            *http.ServeMux
	httpServer     *http.Server
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

	// Set up PID-based process checking for non-standalone mode.
	var checker session.ProcessChecker
	if !cfg.Standalone {
		if c := pidcheck.NewChecker(cfg.ClaudeDir); c != nil {
			checker = c
			idx.SetProcessChecker(c)
		}
	}

	broker, err := watcher.NewBroker(cfg.ClaudeDir, idx, cfg.Standalone, cfg.Dirs, checker)
	if err != nil {
		return nil, fmt.Errorf("start broker: %w", err)
	}

	host := cfg.Host
	if host == "" {
		host = "127.0.0.1"
	}

	s := &Server{
		claudeDir:      cfg.ClaudeDir,
		standalone:     cfg.Standalone,
		paths:          cfg.Paths,
		dirs:           cfg.Dirs,
		settingsPath:   cfg.SettingsPath,
		projectsPath:   cfg.ProjectsPath,
		host:           host,
		token:          cfg.Token,
		allowedOrigins: append([]string(nil), cfg.AllowedOrigins...),
		index:          idx,
		broker:         broker,
		mux:            http.NewServeMux(),
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
	s.mux.HandleFunc("GET /api/settings", s.handleGetSettings)
	s.mux.HandleFunc("PUT /api/settings", s.handleUpdateSettings)
	s.mux.HandleFunc("GET /api/projects", s.handleGetProjects)
	s.mux.HandleFunc("PUT /api/projects", s.handleUpdateProjects)
	s.mux.HandleFunc("GET /api/sessions", s.handleListSessions)
	s.mux.HandleFunc("GET /api/sessions/{id}/subagents/{agentId}", s.handleGetSubagent)
	s.mux.HandleFunc("GET /api/sessions/{id}/raw", s.handleGetSessionRaw)
	s.mux.HandleFunc("GET /api/sessions/{id}/stream", s.handleSessionStream)
	s.mux.HandleFunc("GET /api/sessions/{id}", s.handleGetSession)
	s.mux.HandleFunc("GET /api/activity", s.handleActivity)
	s.mux.HandleFunc("GET /api/search", s.handleSearch)
	s.mux.HandleFunc("POST /api/auth/stream", s.handleAuthStream)

	// Serve embedded SPA for all other routes.
	s.mux.Handle("/", spa.Handler())
}

// ListenAndServe starts the HTTP server on the given address.
func (s *Server) ListenAndServe(port int, certFile, keyFile string) error {
	addr := fmt.Sprintf("%s:%d", s.host, port)

	var handler http.Handler = corsHandler(port, s.allowedOrigins, s.mux)
	if s.token != "" {
		handler = tokenAuthMiddleware(s.token, handler)
	}

	s.httpServer = &http.Server{Addr: addr, Handler: handler}
	if certFile != "" && keyFile != "" {
		return s.httpServer.ListenAndServeTLS(certFile, keyFile)
	}
	return s.httpServer.ListenAndServe()
}

// Shutdown gracefully stops the HTTP server and cleans up resources.
func (s *Server) Shutdown(ctx context.Context) error {
	s.broker.Close()
	return s.httpServer.Shutdown(ctx)
}

// localhostOrigins returns the set of allowed origins for the given port.
func localhostOrigins(port int) map[string]struct{} {
	p := strconv.Itoa(port)
	return map[string]struct{}{
		"http://localhost:" + p:  {},
		"http://127.0.0.1:" + p:  {},
		"http://[::1]:" + p:      {},
		"https://localhost:" + p: {},
		"https://127.0.0.1:" + p: {},
		"https://[::1]:" + p:     {},
	}
}

// isAllowedOrigin checks the built-in localhost origins and any exact origins
// explicitly configured by the operator. LAN mode does not implicitly trust
// every browser origin on a private network.
func isAllowedOrigin(origin string, port int, additional []string) bool {
	allowed := localhostOrigins(port)
	if _, ok := allowed[origin]; ok {
		return true
	}
	for _, candidate := range additional {
		if origin == candidate {
			return true
		}
	}
	return false
}

// corsHandler wraps a handler with CORS headers restricted to allowed origins.
func corsHandler(port int, additionalOrigins []string, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		if origin != "" && isAllowedOrigin(origin, port, additionalOrigins) {
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Access-Control-Allow-Methods", "GET, PUT, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
			w.Header().Set("Vary", "Origin")
		}
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

// streamAuthCookie names the HttpOnly cookie that authenticates the SSE stream.
// EventSource cannot set request headers, so the stream is authorized by a cookie
// issued from a header-authenticated handshake — keeping the token out of URLs.
const streamAuthCookie = "vibeview_stream_token"

// tokenAuthMiddleware validates access tokens on API requests using a
// constant-time comparison. The token is taken from the Authorization: Bearer
// header (preferred) or, for the SSE stream that cannot set headers, the stream
// auth cookie. Non-API routes (static assets, SPA) are served without auth so
// the page can load.
func tokenAuthMiddleware(token string, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !strings.HasPrefix(r.URL.Path, "/api/") {
			next.ServeHTTP(w, r)
			return
		}
		if requestHasValidToken(r, token) {
			next.ServeHTTP(w, r)
			return
		}
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "unauthorized"})
	})
}

// requestHasValidToken reports whether the request carries the access token via
// the Authorization: Bearer header or the stream auth cookie.
func requestHasValidToken(r *http.Request, token string) bool {
	if auth := r.Header.Get("Authorization"); strings.HasPrefix(auth, "Bearer ") {
		if tokensEqual(strings.TrimPrefix(auth, "Bearer "), token) {
			return true
		}
	}
	if c, err := r.Cookie(streamAuthCookie); err == nil {
		if tokensEqual(c.Value, token) {
			return true
		}
	}
	return false
}

// tokensEqual compares two tokens in constant time to avoid a timing side channel.
func tokensEqual(a, b string) bool {
	return subtle.ConstantTimeCompare([]byte(a), []byte(b)) == 1
}

// handleAuthStream issues the cookie that authenticates the SSE stream. It is
// reached only after tokenAuthMiddleware validates the Bearer header, so the
// client proves possession of the token via a header before the server hands
// back an HttpOnly cookie — the token itself never appears in a URL.
func (s *Server) handleAuthStream(w http.ResponseWriter, r *http.Request) {
	if s.token == "" {
		w.WriteHeader(http.StatusNoContent)
		return
	}
	http.SetCookie(w, &http.Cookie{
		Name:     streamAuthCookie,
		Value:    s.token,
		Path:     "/api/",
		HttpOnly: true,
		SameSite: http.SameSiteStrictMode,
	})
	w.WriteHeader(http.StatusNoContent)
}

// --- Handlers ---

func (s *Server) handleConfig(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, ConfigResponse{
		ClaudeDir:    s.claudeDir,
		Standalone:   s.standalone,
		Paths:        s.paths,
		Dirs:         s.dirs,
		SettingsPath: s.settingsPath,
		ProjectsPath: s.projectsPath,
	})
}

func (s *Server) handleHealth(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
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
	const maxBodySize = 10 * 1024 // 10 KB
	body, err := io.ReadAll(io.LimitReader(r.Body, maxBodySize+1))
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "failed to read body"})
		return
	}
	if len(body) > maxBodySize {
		writeJSON(w, http.StatusRequestEntityTooLarge, map[string]string{"error": "request body too large"})
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
		resp := map[string]any{"error": err.Error()}
		if fieldErrs := settings.ValidateFields(merged); fieldErrs != nil {
			resp["fieldErrors"] = fieldErrs
		}
		writeJSON(w, http.StatusBadRequest, resp)
		return
	}

	writeJSON(w, http.StatusOK, merged)
}

func (s *Server) handleGetProjects(w http.ResponseWriter, r *http.Request) {
	list, err := projects.Load(s.projectsPath)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, list)
}

func (s *Server) handleUpdateProjects(w http.ResponseWriter, r *http.Request) {
	const maxBodySize = 100 * 1024 // 100 KB
	body, err := io.ReadAll(io.LimitReader(r.Body, maxBodySize+1))
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "failed to read body"})
		return
	}
	if len(body) > maxBodySize {
		writeJSON(w, http.StatusRequestEntityTooLarge, map[string]string{"error": "request body too large"})
		return
	}

	var list []projects.Project
	if err := json.Unmarshal(body, &list); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": fmt.Sprintf("invalid JSON: %v", err)})
		return
	}

	if err := projects.Save(s.projectsPath, list); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}

	writeJSON(w, http.StatusOK, list)
}

// resolveProjectDirs looks up a project by ID and returns its folder paths.
func (s *Server) resolveProjectDirs(projectID string) []string {
	if projectID == "" {
		return nil
	}
	list, err := projects.Load(s.projectsPath)
	if err != nil {
		return nil
	}
	for _, p := range list {
		if p.ID == projectID {
			return p.FolderPaths
		}
	}
	return nil
}

// filterByDirs returns sessions whose Project matches any of the given directories.
func filterByDirs(sessions []session.SessionMeta, dirs []string) []session.SessionMeta {
	filtered := make([]session.SessionMeta, 0)
	for _, sm := range sessions {
		for _, d := range dirs {
			if strings.Contains(sm.Project, d) {
				filtered = append(filtered, sm)
				break
			}
		}
	}
	return filtered
}

// sortSessions orders the full filtered set in place by the given column and
// direction. Sorting server-side (before pagination) keeps sort and pagination
// consistent — the whole result set is ordered, not just the visible page.
// The column/direction values mirror the web client's sort controls; unknown
// values fall back to date descending (most-recent first), matching the index's
// default order.
func sortSessions(sessions []session.SessionMeta, column, direction string) {
	less := sessionLess(column)
	// Default to descending; the client sends "asc" explicitly when needed.
	desc := direction != "asc"
	sort.SliceStable(sessions, func(i, j int) bool {
		if desc {
			return less(sessions[j], sessions[i])
		}
		return less(sessions[i], sessions[j])
	})
}

// sessionLess returns an ascending comparator for the given sort column,
// mirroring the web client's getSortValue semantics.
func sessionLess(column string) func(a, b session.SessionMeta) bool {
	switch column {
	case "name":
		return func(a, b session.SessionMeta) bool { return sessionSortName(a) < sessionSortName(b) }
	case "directory":
		return func(a, b session.SessionMeta) bool {
			return strings.ToLower(a.Project) < strings.ToLower(b.Project)
		}
	case "messages":
		return func(a, b session.SessionMeta) bool { return a.MessageCount < b.MessageCount }
	case "tokens":
		return func(a, b session.SessionMeta) bool {
			return a.Usage.InputTokens+a.Usage.OutputTokens < b.Usage.InputTokens+b.Usage.OutputTokens
		}
	case "cost":
		return func(a, b session.SessionMeta) bool { return a.Usage.CostUSD < b.Usage.CostUSD }
	default: // "date"
		return func(a, b session.SessionMeta) bool { return a.Timestamp < b.Timestamp }
	}
}

// sessionSortName resolves the display name used for name-column sorting:
// custom title, then slug, then session ID — matching the web client.
func sessionSortName(m session.SessionMeta) string {
	name := m.CustomTitle
	if name == "" {
		name = m.Slug
	}
	if name == "" {
		name = m.SessionID
	}
	return strings.ToLower(name)
}

func (s *Server) handleListSessions(w http.ResponseWriter, r *http.Request) {
	sessions := s.index.GetSessions()
	if projectID := r.URL.Query().Get("project"); projectID != "" {
		if projectDirs := s.resolveProjectDirs(projectID); len(projectDirs) > 0 {
			sessions = filterByDirs(sessions, projectDirs)
		}
	}
	if dir := r.URL.Query().Get("dir"); dir != "" {
		filtered := make([]session.SessionMeta, 0)
		for _, sm := range sessions {
			if strings.Contains(sm.Project, dir) {
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
				strings.Contains(strings.ToLower(sm.CustomTitle), query) ||
				strings.Contains(strings.ToLower(sm.SessionID), query) {
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

	// Sort the full filtered set server-side, before pagination, so sort and
	// pagination agree across pages.
	sortSessions(sessions, r.URL.Query().Get("sort"), r.URL.Query().Get("order"))

	total := len(sessions)

	// Aggregate token/cost totals over the full filtered set (before pagination)
	// so the client's stat cards share scope with the total session count.
	var totalTokens int
	var totalCost float64
	for _, sm := range sessions {
		totalTokens += sm.Usage.InputTokens + sm.Usage.OutputTokens
		totalCost += sm.Usage.CostUSD
	}

	// Apply limit/offset pagination.
	if limitStr := r.URL.Query().Get("limit"); limitStr != "" {
		limit, err := strconv.Atoi(limitStr)
		if err == nil && limit > 0 {
			if limit > 1000 {
				limit = 1000
			}
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
		Sessions:    resp,
		Total:       total,
		TotalTokens: totalTokens,
		TotalCost:   totalCost,
	})
}

func (s *Server) handleGetSession(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")

	meta := s.index.FindSession(id)
	if meta == nil {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "session not found"})
		return
	}

	path, err := session.ResolveFilePath(s.claudeDir, *meta)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid session path"})
		return
	}
	// Contain the resolved path so a session file that symlinks outside the
	// Claude directory is not followed on read — parity with the tailer path.
	if _, err := pathutil.SafeResolve(path, s.claudeDir); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid session path"})
		return
	}
	f, err := os.Open(path)
	if err != nil {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "session file not found"})
		return
	}
	defer f.Close()

	messages, parseResult, err := claude.ParseSessionFile(f)
	if err != nil {
		// A read error after some messages were parsed is recoverable: render the
		// partial content rather than discarding it. Reserve 5xx for genuinely
		// unreadable files where nothing could be parsed.
		if len(messages) == 0 {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to parse session"})
			return
		}
		log.Printf("session %s: read error after %d messages, rendering partial content: %v", id, len(messages), err)
	}

	msgResponses := make([]messagedto.Message, 0, len(messages))
	for _, msg := range messages {
		msgResponses = append(msgResponses, messagedto.From(msg))
	}

	extracted := insights.Extract(messages)
	sessionDir := strings.TrimSuffix(path, ".jsonl")
	insights.ResolveSubagentIDs(extracted.Subagents, sessionDir)
	// Timeline strings (prompt previews, commands, file paths) are redacted at
	// the source by timeline.Build, matching the rest of the payload.
	tl := timeline.Build(messages)
	resp := SessionDetailResponse{
		SessionResponse: toSessionResponse(*meta),
		FilePath:        redact.MaskHomePath(path),
		Messages:        msgResponses,
		Insights:        &extracted,
		Timeline:        &tl,
		SkippedLines:    parseResult.SkippedLines,
	}
	writeJSON(w, http.StatusOK, resp)
}

// maxRawSessionBytes caps the raw session content returned to the client so a
// multi-megabyte JSONL cannot freeze the browser rendering it.
const maxRawSessionBytes = 2 << 20 // 2 MiB

// handleGetSessionRaw streams a session's raw JSONL content, redacted for
// consistency with the rest of the payload and capped at maxRawSessionBytes.
func (s *Server) handleGetSessionRaw(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")

	meta := s.index.FindSession(id)
	if meta == nil {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "session not found"})
		return
	}

	path, err := session.ResolveFilePath(s.claudeDir, *meta)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid session path"})
		return
	}
	// Contain the resolved path so a symlinked session file is not followed
	// outside the Claude directory — parity with handleGetSession.
	if _, err := pathutil.SafeResolve(path, s.claudeDir); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid session path"})
		return
	}
	f, err := os.Open(path)
	if err != nil {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "session file not found"})
		return
	}
	defer f.Close()

	// Read one byte past the cap so we can distinguish a truncated file.
	buf, err := io.ReadAll(io.LimitReader(f, maxRawSessionBytes+1))
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to read session"})
		return
	}
	truncated := len(buf) > maxRawSessionBytes
	if truncated {
		buf = buf[:maxRawSessionBytes]
	}

	content := redact.MaskHomePath(redact.RedactSecrets(string(buf)))
	writeJSON(w, http.StatusOK, map[string]any{
		"content":   content,
		"truncated": truncated,
	})
}

func (s *Server) handleGetSubagent(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	agentID := r.PathValue("agentId")

	// Reject any agent ID that could walk outside the subagents directory before
	// it is interpolated into a filesystem path.
	if err := pathutil.ValidateAgentID(agentID); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid agent ID"})
		return
	}

	meta := s.index.FindSession(id)
	if meta == nil {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "session not found"})
		return
	}

	sessionPath, err := session.ResolveFilePath(s.claudeDir, *meta)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid session path"})
		return
	}
	// Contain the resolved session path before deriving the subagents directory
	// from it, so a symlinked session file cannot redirect reads outside the
	// Claude directory.
	if _, err := pathutil.SafeResolve(sessionPath, s.claudeDir); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid session path"})
		return
	}

	// Subagent files live at {session-dir}/subagents/agent-{agentId}.jsonl
	sessionDir := strings.TrimSuffix(sessionPath, ".jsonl")
	subagentsDir := filepath.Join(sessionDir, "subagents")

	// If the agent ID is a synthetic tool_use_ prefix, resolve to the real file ID
	// by matching the tool_use ID against the session's Agent tool_use blocks.
	if strings.HasPrefix(agentID, "tool_use_") {
		if resolved := resolveToolUseAgentID(sessionDir, agentID); resolved != "" {
			agentID = resolved
		}
	}

	// Resolve and contain the path so a symlink or crafted ID cannot escape the
	// session's subagents directory.
	agentPath, err := safeSubagentPath(subagentsDir, agentID, ".jsonl")
	if err != nil {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "subagent session not found"})
		return
	}

	f, err := os.Open(agentPath)
	if err != nil {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "subagent session not found"})
		return
	}
	defer f.Close()

	messages, parseResult, err := claude.ParseSessionFile(f)
	if err != nil {
		// Render partial content on a recoverable read error; reserve 5xx for a
		// genuinely unreadable file where nothing could be parsed.
		if len(messages) == 0 {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to parse subagent session"})
			return
		}
		log.Printf("subagent %s: read error after %d messages, rendering partial content: %v", agentID, len(messages), err)
	}

	msgResponses := make([]messagedto.Message, 0, len(messages))
	for _, msg := range messages {
		msgResponses = append(msgResponses, messagedto.From(msg))
	}

	// Read optional meta file for agent type and description. A missing or
	// unsafe meta path is not fatal — the agent conversation still renders.
	var agentType, description string
	if metaPath, err := safeSubagentPath(subagentsDir, agentID, ".meta.json"); err == nil {
		if metaBytes, err := os.ReadFile(metaPath); err == nil {
			var metaData struct {
				AgentType   string `json:"agentType"`
				Description string `json:"description"`
			}
			if json.Unmarshal(metaBytes, &metaData) == nil {
				agentType = metaData.AgentType
				description = metaData.Description
			}
		}
	}

	extracted := insights.Extract(messages)
	resp := SubagentDetailResponse{
		AgentID:      agentID,
		AgentType:    agentType,
		Description:  description,
		Messages:     msgResponses,
		Insights:     &extracted,
		SkippedLines: parseResult.SkippedLines,
	}
	writeJSON(w, http.StatusOK, resp)
}

// safeSubagentPath builds the path to a subagent file (agent-<id><suffix>) and
// verifies it stays within subagentsDir, guarding against traversal and symlink
// escape. It returns an error if the ID is malformed or the resolved path
// escapes the directory (which also covers the file simply not existing).
func safeSubagentPath(subagentsDir, agentID, suffix string) (string, error) {
	if err := pathutil.ValidateAgentID(agentID); err != nil {
		return "", err
	}
	path := filepath.Join(subagentsDir, "agent-"+agentID+suffix)
	return pathutil.SafeResolve(path, subagentsDir)
}

// resolveToolUseAgentID resolves a synthetic "tool_use_<toolUseId>" agent ID
// to the real agent file ID by matching the tool_use description against meta files.
func resolveToolUseAgentID(sessionDir, syntheticID string) string {
	toolUseID := strings.TrimPrefix(syntheticID, "tool_use_")

	// Read the parent session to find the Agent tool_use description.
	parentPath := sessionDir + ".jsonl"
	pf, err := os.Open(parentPath)
	if err != nil {
		return ""
	}
	defer pf.Close()
	messages, _, err := claude.ParseSessionFile(pf)
	if err != nil {
		return ""
	}

	var description string
	for _, msg := range messages {
		for _, block := range insights.GetContentBlocks(msg) {
			if block.Type == "tool_use" && block.Name == "Agent" && block.ID == toolUseID {
				description, _ = block.Input["description"].(string)
				break
			}
		}
		if description != "" {
			break
		}
	}
	if description == "" {
		return ""
	}

	// Match against meta files.
	subagentsDir := filepath.Join(sessionDir, "subagents")
	files, err := os.ReadDir(subagentsDir)
	if err != nil {
		return ""
	}
	for _, f := range files {
		name := f.Name()
		if !strings.HasPrefix(name, "agent-") || !strings.HasSuffix(name, ".meta.json") {
			continue
		}
		// Contain each meta read within subagentsDir so a symlinked entry
		// cannot redirect the read outside the directory.
		metaPath, err := pathutil.SafeResolve(filepath.Join(subagentsDir, name), subagentsDir)
		if err != nil {
			continue
		}
		data, err := os.ReadFile(metaPath)
		if err != nil {
			continue
		}
		var meta struct {
			Description string `json:"description"`
		}
		if json.Unmarshal(data, &meta) == nil && meta.Description == description {
			return strings.TrimSuffix(strings.TrimPrefix(name, "agent-"), ".meta.json")
		}
	}
	return ""
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

	client, err := s.broker.Subscribe(id)
	if err != nil {
		writeJSON(w, http.StatusServiceUnavailable, map[string]string{"error": err.Error()})
		return
	}
	defer s.broker.Unsubscribe(client)

	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.WriteHeader(http.StatusOK)
	flusher.Flush()

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
	if sessionID := r.URL.Query().Get("session"); sessionID != "" {
		meta := s.index.FindSession(sessionID)
		if meta == nil {
			writeJSON(w, http.StatusNotFound, map[string]string{"error": "session not found"})
			return
		}
		path, err := session.ResolveFilePath(s.claudeDir, *meta)
		if err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid session path"})
			return
		}
		if _, err := pathutil.SafeResolve(path, s.claudeDir); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid session path"})
			return
		}
		file, err := os.Open(path)
		if err != nil {
			writeJSON(w, http.StatusNotFound, map[string]string{"error": "session file not found"})
			return
		}
		defer file.Close()
		messages, _, err := claude.ParseSessionFile(file)
		if err != nil && len(messages) == 0 {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "failed to parse session"})
			return
		}
		results := search.SearchMessages(messages, q, limit)
		writeJSON(w, http.StatusOK, MessageSearchResponse{Results: results, Total: len(results)})
		return
	}

	var dirs []string
	if projectID := r.URL.Query().Get("project"); projectID != "" {
		dirs = s.resolveProjectDirs(projectID)
	}

	results := search.Search(r.Context(), s.index, search.Options{
		Query:     q,
		Limit:     limit,
		ClaudeDir: s.claudeDir,
		Dirs:      dirs,
	})

	resp := SearchResponse{
		Results: make([]SearchResultResponse, 0, len(results)),
		Total:   len(results),
	}
	for _, r := range results {
		resp.Results = append(resp.Results, SearchResultResponse{
			Session: toSessionResponse(r.Meta),
			Snippet: redact.RedactSecrets(r.Snippet),
		})
	}
	writeJSON(w, http.StatusOK, resp)
}

func (s *Server) handleActivity(w http.ResponseWriter, r *http.Request) {
	allSessions := s.index.GetSessions()

	// Always build the full dirs list so the filter dropdown stays visible.
	dirSet := make(map[string]struct{})
	for _, sm := range allSessions {
		if sm.Project != "" {
			dirSet[sm.Project] = struct{}{}
		}
	}
	dirs := make([]string, 0, len(dirSet))
	for p := range dirSet {
		dirs = append(dirs, p)
	}
	sort.Strings(dirs)

	// Apply project and dir filters for day/hour counts.
	sessions := allSessions
	if projectID := r.URL.Query().Get("project"); projectID != "" {
		if projectDirs := s.resolveProjectDirs(projectID); len(projectDirs) > 0 {
			sessions = filterByDirs(sessions, projectDirs)
			// Scope the dirs dropdown to only show directories within the project.
			scopedDirs := make([]string, 0)
			for _, d := range dirs {
				for _, pd := range projectDirs {
					if strings.Contains(d, pd) {
						scopedDirs = append(scopedDirs, d)
						break
					}
				}
			}
			dirs = scopedDirs
		}
	}
	if dir := r.URL.Query().Get("dir"); dir != "" {
		filtered := make([]session.SessionMeta, 0)
		for _, sm := range sessions {
			if strings.Contains(sm.Project, dir) {
				filtered = append(filtered, sm)
			}
		}
		sessions = filtered
	}

	dayCounts := make(map[string]int)
	hourCounts := make(map[int]int)
	for _, sm := range sessions {
		if sm.Timestamp == 0 {
			continue
		}
		t := time.UnixMilli(sm.Timestamp).UTC()
		dayCounts[t.Format("2006-01-02")]++
		hourCounts[t.Hour()]++
	}

	days := make([]ActivityDayResponse, 0, len(dayCounts))
	for date, count := range dayCounts {
		days = append(days, ActivityDayResponse{Date: date, Count: count})
	}
	sort.Slice(days, func(i, j int) bool { return days[i].Date < days[j].Date })

	hours := make([]ActivityHourResponse, 24)
	for h := 0; h < 24; h++ {
		hours[h] = ActivityHourResponse{Hour: h, Count: hourCounts[h]}
	}

	dayYears, weekYears, months := buildActivityBuckets(days, time.Now())
	writeJSON(w, http.StatusOK, ActivityResponse{Days: days, DayYears: dayYears, WeekYears: weekYears, Months: months, Hours: hours, Dirs: dirs})
}

// --- Response Types ---

// ConfigResponse is the API representation of the server configuration.
type ConfigResponse struct {
	ClaudeDir    string   `json:"claudeDir"`
	Standalone   bool     `json:"standalone"`
	Paths        []string `json:"paths,omitempty"`
	Dirs         []string `json:"dirs,omitempty"`
	SettingsPath string   `json:"settingsPath"`
	ProjectsPath string   `json:"projectsPath"`
}

// ActivityDayResponse is a single day's session count.
type ActivityDayResponse struct {
	Date  string `json:"date"`
	Count int    `json:"count"`
}

// ActivityHourResponse is a single hour's session count.
type ActivityHourResponse struct {
	Hour  int `json:"hour"`
	Count int `json:"count"`
}

// ActivityResponse is the API representation of daily activity data.
type ActivityResponse struct {
	Days      []ActivityDayResponse          `json:"days"`
	DayYears  []ActivityDayGridYearResponse  `json:"dayYears"`
	WeekYears []ActivityWeekGridYearResponse `json:"weekYears"`
	Months    []ActivityMonthCellResponse    `json:"months"`
	Hours     []ActivityHourResponse         `json:"hours"`
	Dirs      []string                       `json:"dirs"`
}

// SessionResponse is the API representation of a session in list responses.
type SessionResponse struct {
	ID            string              `json:"id"`
	Dir           string              `json:"dir"`
	CustomTitle   string              `json:"customTitle"`
	Timestamp     string              `json:"timestamp"`
	MessageCount  int                 `json:"messageCount"`
	Model         string              `json:"model"`
	Slug          string              `json:"slug"`
	Usage         session.UsageTotals `json:"usage"`
	ActivityState string              `json:"activityState"`
}

// PaginatedSessionsResponse wraps a page of sessions with the total count and
// aggregate usage totals over the full filtered set (not just the returned page).
type PaginatedSessionsResponse struct {
	Sessions    []SessionResponse `json:"sessions"`
	Total       int               `json:"total"`
	TotalTokens int               `json:"totalTokens"`
	TotalCost   float64           `json:"totalCost"`
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

type MessageSearchResponse struct {
	Results []search.MessageResult `json:"results"`
	Total   int                    `json:"total"`
}

// SubagentDetailResponse is the API representation of a subagent's conversation.
type SubagentDetailResponse struct {
	AgentID      string                    `json:"agentId"`
	AgentType    string                    `json:"agentType,omitempty"`
	Description  string                    `json:"description,omitempty"`
	Messages     []messagedto.Message      `json:"messages"`
	Insights     *insights.SessionInsights `json:"insights,omitempty"`
	SkippedLines int                       `json:"skippedLines,omitempty"`
}

// SessionDetailResponse is the API representation of a single session with messages.
type SessionDetailResponse struct {
	SessionResponse
	FilePath     string                     `json:"filePath"`
	Messages     []messagedto.Message       `json:"messages"`
	Insights     *insights.SessionInsights  `json:"insights,omitempty"`
	Timeline     *timeline.TimelineResponse `json:"timeline,omitempty"`
	SkippedLines int                        `json:"skippedLines,omitempty"`
}

// --- Helpers ---

func toSessionResponse(m session.SessionMeta) SessionResponse {
	return SessionResponse{
		ID:            m.SessionID,
		Dir:           m.Project,
		CustomTitle:   m.CustomTitle,
		Timestamp:     msToISO(m.Timestamp),
		MessageCount:  m.MessageCount,
		Model:         m.Model,
		Slug:          m.Slug,
		Usage:         m.Usage,
		ActivityState: m.ActivityState,
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
	if err := json.NewEncoder(w).Encode(v); err != nil {
		log.Printf("writeJSON: failed to encode response: %v", err)
	}
}
