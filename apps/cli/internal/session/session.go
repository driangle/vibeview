// Package session handles discovery and indexing of Claude Code sessions.
package session

import (
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strings"
	"sync"

	"github.com/driangle/vibeview/internal/claude"
	"github.com/driangle/vibeview/internal/logutil"
)

// UsageTotals holds aggregated token and cost data for a session.
type UsageTotals struct {
	InputTokens              int     `json:"inputTokens"`
	OutputTokens             int     `json:"outputTokens"`
	CacheCreationInputTokens int     `json:"cacheCreationInputTokens"`
	CacheReadInputTokens     int     `json:"cacheReadInputTokens"`
	CostUSD                  float64 `json:"costUSD"`
}

// SessionMeta holds metadata extracted from a session's history entry and JSONL file.
type SessionMeta struct {
	SessionID     string      `json:"sessionId"`
	Project       string      `json:"project"`
	CustomTitle   string      `json:"customTitle"`
	Timestamp     int64       `json:"timestamp"` // epoch millis
	MessageCount  int         `json:"messageCount"`
	Model         string      `json:"model"`
	Slug          string      `json:"slug"`
	Usage         UsageTotals `json:"usage"`
	ActivityState string      `json:"activityState"`

	// FilePath is the absolute path to the JSONL file for standalone sessions.
	// Empty for sessions discovered from ~/.claude.
	FilePath string `json:"-"`
}

// Index holds all discovered sessions. It is safe for concurrent access.
type Index struct {
	mu       sync.RWMutex
	Sessions []SessionMeta
}

// GetSessions returns a snapshot of all sessions.
func (idx *Index) GetSessions() []SessionMeta {
	idx.mu.RLock()
	defer idx.mu.RUnlock()
	out := make([]SessionMeta, len(idx.Sessions))
	copy(out, idx.Sessions)
	return out
}

// FindSession returns a pointer to the session with the given ID, or nil.
func (idx *Index) FindSession(id string) *SessionMeta {
	idx.mu.RLock()
	defer idx.mu.RUnlock()
	for i := range idx.Sessions {
		if idx.Sessions[i].SessionID == id {
			s := idx.Sessions[i]
			return &s
		}
	}
	return nil
}

// SetCustomTitle updates the custom title for a session in the index.
func (idx *Index) SetCustomTitle(id, title string) {
	idx.mu.Lock()
	defer idx.mu.Unlock()
	for i := range idx.Sessions {
		if idx.Sessions[i].SessionID == id {
			idx.Sessions[i].CustomTitle = title
			return
		}
	}
}

// SetActivityState updates the activity state for a session in the index.
func (idx *Index) SetActivityState(id, state string) {
	idx.mu.Lock()
	defer idx.mu.Unlock()
	for i := range idx.Sessions {
		if idx.Sessions[i].SessionID == id {
			idx.Sessions[i].ActivityState = state
			return
		}
	}
}

// Discover reads history.jsonl and builds an index with basic metadata.
// This is fast — it only reads the small history file, not individual session files.
// When dirs is non-empty, only sessions whose encoded project path matches one of
// the specified directory names are included.
func Discover(claudeDir string, dirs []string) (*Index, error) {
	historyPath := filepath.Join(claudeDir, "history.jsonl")
	f, err := os.Open(historyPath)
	if err != nil {
		return nil, err
	}
	defer f.Close()

	entries, err := claude.ParseHistoryFile(f)
	if err != nil {
		return nil, err
	}

	// Build a set of valid dirs for filtering.
	dirSet := buildDirSet(claudeDir, dirs)

	// Deduplicate by session ID, keeping the entry with the latest timestamp.
	seen := make(map[string]int) // sessionID -> index in sessions slice
	var sessions []SessionMeta
	for _, entry := range entries {
		if !matchesDirFilter(dirSet, entry.Project) {
			continue
		}
		meta := SessionMeta{
			SessionID: entry.SessionID,
			Project:   entry.Project,
			Timestamp: entry.Timestamp.Int64(),
		}
		if idx, exists := seen[entry.SessionID]; exists {
			if meta.Timestamp > sessions[idx].Timestamp {
				sessions[idx] = meta
			}
		} else {
			seen[entry.SessionID] = len(sessions)
			sessions = append(sessions, meta)
		}
	}

	// Sort by timestamp descending (most recent first).
	sort.Slice(sessions, func(i, j int) bool {
		return sessions[i].Timestamp > sessions[j].Timestamp
	})

	return &Index{Sessions: sessions}, nil
}

// buildDirSet resolves user-provided directory names against actual subdirectories
// under claudeDir/projects/. Each value can be an exact encoded directory name,
// or a simple name like "myproject" that is matched against the basename of the
// decoded project path. Returns a set of matched encoded directory names.
// Warns on stderr for any value that doesn't match. Returns nil if dirs is empty.
func buildDirSet(claudeDir string, dirs []string) map[string]struct{} {
	if len(dirs) == 0 {
		return nil
	}

	projectsDir := filepath.Join(claudeDir, "projects")
	entries, err := os.ReadDir(projectsDir)
	if err != nil {
		logutil.Warnf("cannot read projects directory %s: %v", projectsDir, err)
		return nil
	}

	dirSet := make(map[string]struct{})
	for _, d := range dirs {
		matched := false
		for _, entry := range entries {
			if !entry.IsDir() {
				continue
			}
			name := entry.Name()
			decoded := claude.DecodeProjectPath(name)
			// Match against: exact encoded name, basename of decoded path,
			// or trailing path suffix.
			if name == d || filepath.Base(decoded) == d || strings.HasSuffix(decoded, "/"+d) {
				dirSet[name] = struct{}{}
				matched = true
			}
		}
		if !matched {
			logutil.Warnf("no project directory matching %q found under %s", d, projectsDir)
		}
	}
	return dirSet
}

// matchesDirFilter returns true if the entry's project matches the dir filter.
// Returns true for all entries when dirSet is nil (no filter).
func matchesDirFilter(dirSet map[string]struct{}, project string) bool {
	if dirSet == nil {
		return true
	}
	encoded := claude.EncodeProjectPath(project)
	_, ok := dirSet[encoded]
	return ok
}

const enrichBatchSize = 100

// Enrich reads each session's JSONL file to populate messageCount, model, usage, and slug.
// Sessions whose JSONL files no longer exist on disk are removed from the index.
// It processes sessions in batches, flushing each batch to the index so that
// readers can see partially-enriched data while enrichment continues.
func (idx *Index) Enrich(claudeDir string) {
	idx.mu.RLock()
	snapshot := make([]SessionMeta, len(idx.Sessions))
	copy(snapshot, idx.Sessions)
	idx.mu.RUnlock()

	idx.enrichRange(claudeDir, snapshot, 0, len(snapshot), true)
}

// EnrichN enriches the first n sessions synchronously and returns.
// Callers typically follow this with a background Enrich call for the rest.
func (idx *Index) EnrichN(claudeDir string, n int) {
	idx.mu.RLock()
	total := len(idx.Sessions)
	idx.mu.RUnlock()

	if n > total {
		n = total
	}
	if n <= 0 {
		return
	}

	idx.mu.RLock()
	snapshot := make([]SessionMeta, len(idx.Sessions))
	copy(snapshot, idx.Sessions)
	idx.mu.RUnlock()

	idx.enrichRange(claudeDir, snapshot, 0, n, false)
}

func (idx *Index) enrichRange(claudeDir string, snapshot []SessionMeta, from, to int, skipEnriched bool) {
	type result struct {
		meta    SessionMeta
		exists  bool
		skipped bool
	}

	for start := from; start < to; start += enrichBatchSize {
		end := start + enrichBatchSize
		if end > to {
			end = to
		}

		results := make([]result, end-start)
		for i, meta := range snapshot[start:end] {
			if skipEnriched && meta.MessageCount > 0 {
				results[i] = result{meta: meta, exists: true, skipped: true}
				continue
			}
			sessionPath := ResolveFilePath(claudeDir, meta)
			if _, err := os.Stat(sessionPath); err != nil {
				logutil.Debugf("session %s has no JSONL file at %s (removing from index)", meta.SessionID, sessionPath)
				results[i] = result{meta: meta, exists: false}
				continue
			}
			results[i] = result{meta: enrichSession(claudeDir, meta), exists: true}
		}

		// If every item was skipped, no index update needed.
		allSkipped := true
		for _, r := range results {
			if !r.skipped {
				allSkipped = false
				break
			}
		}
		if allSkipped {
			continue
		}

		// Flush this batch into the index.
		idx.mu.Lock()
		for i, r := range results {
			si := start + i
			if r.exists {
				idx.Sessions[si] = r.meta
			} else {
				idx.Sessions[si].SessionID = ""
			}
		}
		// On final batch, compact out removed sessions.
		if end == to {
			filtered := make([]SessionMeta, 0, len(idx.Sessions))
			for _, s := range idx.Sessions {
				if s.SessionID != "" {
					filtered = append(filtered, s)
				}
			}
			idx.Sessions = filtered
		}
		idx.mu.Unlock()
	}
}

// enrichSession reads a session's JSONL file and populates derived fields.
func enrichSession(claudeDir string, meta SessionMeta) SessionMeta {
	sessionPath := SessionFilePath(claudeDir, meta.Project, meta.SessionID)
	f, err := os.Open(sessionPath)
	if err != nil {
		return meta
	}
	defer f.Close()

	messages, _ := claude.ParseSessionFile(f)
	meta.MessageCount = len(messages)

	for _, msg := range messages {
		if msg.Type == claude.MessageTypeAssistant && msg.Message != nil {
			if meta.Model == "" && msg.Message.Model != "" {
				meta.Model = msg.Message.Model
			}
			if msg.Message.Usage != nil {
				u := msg.Message.Usage
				meta.Usage.InputTokens += u.InputTokens
				meta.Usage.OutputTokens += u.OutputTokens
				meta.Usage.CacheCreationInputTokens += u.CacheCreationInputTokens
				meta.Usage.CacheReadInputTokens += u.CacheReadInputTokens
				meta.Usage.CostUSD += claude.CalculateCost(msg.Message.Model, *u)
			}
		}
		if msg.Type == claude.MessageTypeCustomTitle && msg.CustomTitle != "" {
			meta.CustomTitle = msg.CustomTitle
		}
		if msg.Type == claude.MessageTypeResult && msg.TotalCostUSD > 0 {
			meta.Usage.CostUSD = msg.TotalCostUSD
		}
	}

	for _, msg := range messages {
		if msg.Type == claude.MessageTypeUser && msg.Message != nil && !msg.IsMeta {
			for _, block := range msg.Message.Content {
				if block.Type == "text" && block.Text != "" {
					meta.Slug = truncateSlug(block.Text, 80)
					break
				}
			}
			break
		}
	}

	meta.ActivityState = DeriveActivityState(messages)

	return meta
}

// SessionFilePath returns the expected path for a session's JSONL file.
func SessionFilePath(claudeDir, project, sessionID string) string {
	encoded := claude.EncodeProjectPath(project)
	return filepath.Join(claudeDir, "projects", encoded, sessionID+".jsonl")
}

// EnrichSession enriches a single session by ID.
// Returns true if the session was enriched (slug is non-empty), false otherwise.
func (idx *Index) EnrichSession(claudeDir string, sessionID string) bool {
	idx.mu.Lock()
	defer idx.mu.Unlock()

	for i := range idx.Sessions {
		if idx.Sessions[i].SessionID != sessionID {
			continue
		}
		enriched := enrichSession(claudeDir, idx.Sessions[i])
		idx.Sessions[i] = enriched
		return enriched.Slug != ""
	}
	return false
}

// AddSession adds a new session from a history entry if it doesn't already exist.
func (idx *Index) AddSession(claudeDir string, entry claude.HistoryEntry) {
	idx.mu.Lock()
	defer idx.mu.Unlock()

	for _, s := range idx.Sessions {
		if s.SessionID == entry.SessionID {
			return
		}
	}
	meta := SessionMeta{
		SessionID: entry.SessionID,
		Project:   entry.Project,
		Timestamp: entry.Timestamp.Int64(),
	}
	idx.Sessions = append([]SessionMeta{meta}, idx.Sessions...)
}

// FilterByProject returns sessions whose project path contains the given substring.
func (idx *Index) FilterByProject(query string) []SessionMeta {
	idx.mu.RLock()
	defer idx.mu.RUnlock()
	var result []SessionMeta
	for _, s := range idx.Sessions {
		if strings.Contains(s.Project, query) {
			result = append(result, s)
		}
	}
	return result
}

// ResolveFilePath returns the absolute path for a session's JSONL file.
// For standalone sessions (FilePath set), it returns FilePath directly.
// For claude-dir sessions, it computes the path from claudeDir + project + sessionID.
func ResolveFilePath(claudeDir string, meta SessionMeta) string {
	if meta.FilePath != "" {
		return meta.FilePath
	}
	return SessionFilePath(claudeDir, meta.Project, meta.SessionID)
}

// LoadFromPaths builds an Index from explicit file and directory paths.
// Directories are walked recursively for *.jsonl files. Files that fail
// to parse are skipped with a warning on stderr.
func LoadFromPaths(paths []string) (*Index, error) {
	var files []string
	for _, p := range paths {
		abs, err := filepath.Abs(p)
		if err != nil {
			logutil.Warnf("cannot resolve path %q: %v", p, err)
			continue
		}
		info, err := os.Stat(abs)
		if err != nil {
			logutil.Warnf("cannot stat %q: %v", abs, err)
			continue
		}
		if info.IsDir() {
			filepath.WalkDir(abs, func(path string, d os.DirEntry, err error) error {
				if err != nil {
					return nil
				}
				if !d.IsDir() && strings.HasSuffix(d.Name(), ".jsonl") {
					files = append(files, path)
				}
				return nil
			})
		} else {
			files = append(files, abs)
		}
	}

	var sessions []SessionMeta
	for _, f := range files {
		meta, err := loadSessionFromFile(f)
		if err != nil {
			logutil.Warnf("skipping %q: %v", f, err)
			continue
		}
		sessions = append(sessions, meta)
	}

	sort.Slice(sessions, func(i, j int) bool {
		return sessions[i].Timestamp > sessions[j].Timestamp
	})

	return &Index{Sessions: sessions}, nil
}

// loadSessionFromFile parses a single JSONL file and synthesizes a SessionMeta.
func loadSessionFromFile(path string) (SessionMeta, error) {
	f, err := os.Open(path)
	if err != nil {
		return SessionMeta{}, err
	}
	defer f.Close()

	messages, err := claude.ParseSessionFile(f)
	if err != nil {
		return SessionMeta{}, err
	}
	if len(messages) == 0 {
		return SessionMeta{}, fmt.Errorf("no messages found")
	}

	// Derive session ID from the sessionId field in messages, falling back to filename.
	sessionID := strings.TrimSuffix(filepath.Base(path), ".jsonl")
	for _, msg := range messages {
		if msg.SessionID != "" {
			sessionID = msg.SessionID
			break
		}
	}

	meta := SessionMeta{
		SessionID:    sessionID,
		FilePath:     path,
		MessageCount: len(messages),
	}

	// Extract timestamp from first message.
	if ts := messages[0].Timestamp.Int64(); ts != 0 {
		meta.Timestamp = ts
	}

	for _, msg := range messages {
		if msg.Type == claude.MessageTypeAssistant && msg.Message != nil {
			if meta.Model == "" && msg.Message.Model != "" {
				meta.Model = msg.Message.Model
			}
			if msg.Message.Usage != nil {
				u := msg.Message.Usage
				meta.Usage.InputTokens += u.InputTokens
				meta.Usage.OutputTokens += u.OutputTokens
				meta.Usage.CacheCreationInputTokens += u.CacheCreationInputTokens
				meta.Usage.CacheReadInputTokens += u.CacheReadInputTokens
				meta.Usage.CostUSD += claude.CalculateCost(msg.Message.Model, *u)
			}
		}
		if msg.Type == claude.MessageTypeCustomTitle && msg.CustomTitle != "" {
			meta.CustomTitle = msg.CustomTitle
		}
		if msg.Type == claude.MessageTypeResult && msg.TotalCostUSD > 0 {
			meta.Usage.CostUSD = msg.TotalCostUSD
		}
	}

	// Derive slug from first user message.
	for _, msg := range messages {
		if msg.Type == claude.MessageTypeUser && msg.Message != nil && !msg.IsMeta {
			for _, block := range msg.Message.Content {
				if block.Type == "text" && block.Text != "" {
					meta.Slug = truncateSlug(block.Text, 80)
					break
				}
			}
			break
		}
	}

	meta.ActivityState = DeriveActivityState(messages)

	return meta, nil
}

var (
	// Strip redundant command-name elements entirely (content duplicates command-message).
	commandNamePattern = regexp.MustCompile(`<command-name>[^<]*</command-name>`)
	xmlTagPattern      = regexp.MustCompile(`<[^>]+>`)
)

// truncateSlug shortens text to maxLen, breaking at a word boundary.
// It strips XML/HTML tags before truncating.
func truncateSlug(text string, maxLen int) string {
	text = commandNamePattern.ReplaceAllString(text, "")
	text = xmlTagPattern.ReplaceAllString(text, "")
	text = strings.Join(strings.Fields(text), " ")
	if len(text) <= maxLen {
		return text
	}
	truncated := text[:maxLen]
	if i := strings.LastIndex(truncated, " "); i > 0 {
		truncated = truncated[:i]
	}
	return truncated + "..."
}
