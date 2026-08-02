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

	"github.com/driangle/vibeview/apps/lib/claude"
	"github.com/driangle/vibeview/apps/lib/logutil"
	"github.com/driangle/vibeview/apps/lib/pathutil"
)

// UsageTotals holds aggregated token and cost data for a session.
// Cost is only populated when the session file contains an explicit
// TotalCostUSD value (e.g. from programmatic sessions).
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
	DurationMs    int64       `json:"durationMs"` // last message timestamp - first message timestamp

	// StartTime and EndTime are the first and last message timestamps (epoch
	// millis), populated during enrichment. They enable reliable time-based
	// clustering of related sessions. Zero when not yet enriched or when the
	// session has no timestamped messages.
	StartTime int64 `json:"startTime"`
	EndTime   int64 `json:"endTime"`

	// FilePath is the absolute path to the JSONL file for standalone sessions.
	// Empty for sessions discovered from ~/.claude.
	FilePath string `json:"-"`
}

// ProcessChecker checks whether a Claude Code process is still running.
type ProcessChecker interface {
	IsProcessAlive(sessionID string) bool
}

// Index holds all discovered sessions. It is safe for concurrent access.
type Index struct {
	mu         sync.RWMutex
	Sessions   []SessionMeta
	pidChecker ProcessChecker
}

// SetProcessChecker sets the PID-based process checker used during enrichment.
func (idx *Index) SetProcessChecker(c ProcessChecker) {
	idx.mu.Lock()
	defer idx.mu.Unlock()
	idx.pidChecker = c
}

// GetSessions returns a snapshot of all sessions.
// Sessions with empty IDs (tombstoned during compaction) are excluded.
func (idx *Index) GetSessions() []SessionMeta {
	idx.mu.RLock()
	defer idx.mu.RUnlock()
	out := make([]SessionMeta, 0, len(idx.Sessions))
	for _, s := range idx.Sessions {
		if s.SessionID != "" {
			out = append(out, s)
		}
	}
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

// FindSessionByPrefix returns the session whose ID starts with prefix.
// Returns an error if the prefix is ambiguous (matches multiple sessions)
// or if no session matches.
func (idx *Index) FindSessionByPrefix(prefix string) (*SessionMeta, error) {
	idx.mu.RLock()
	defer idx.mu.RUnlock()

	var matches []SessionMeta
	for _, s := range idx.Sessions {
		if strings.HasPrefix(s.SessionID, prefix) {
			matches = append(matches, s)
		}
	}
	switch len(matches) {
	case 0:
		return nil, fmt.Errorf("no session matching prefix %q", prefix)
	case 1:
		return &matches[0], nil
	default:
		return nil, fmt.Errorf("ambiguous prefix %q matches %d sessions", prefix, len(matches))
	}
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

// ActiveSessionIDs returns the IDs of sessions whose activity state is not idle.
func (idx *Index) ActiveSessionIDs() []string {
	idx.mu.RLock()
	defer idx.mu.RUnlock()
	var ids []string
	for _, s := range idx.Sessions {
		if s.SessionID != "" && s.ActivityState != "" && s.ActivityState != ActivityIdle {
			ids = append(ids, s.SessionID)
		}
	}
	return ids
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
//
// After reading history.jsonl, Discover performs a filesystem scan of the projects
// directory to pick up sessions that are missing from history (e.g. SDK-launched
// sessions). History entries are canonical — filesystem-only sessions are appended
// without overriding existing metadata.
func Discover(claudeDir string, dirs []string) (*Index, error) {
	filter := NewDirFilter(dirs)

	// Deduplicate by session ID, keeping the entry with the latest timestamp.
	seen := make(map[string]int) // sessionID -> index in sessions slice
	var sessions []SessionMeta

	historyPath := filepath.Join(claudeDir, "history.jsonl")
	f, err := os.Open(historyPath)
	if err == nil {
		defer f.Close()
		entries, parseResult, err := claude.ParseHistoryFile(f)
		if err != nil {
			return nil, err
		}
		if parseResult.SkippedLines > 0 {
			logutil.Warnf("history.jsonl: skipped %d malformed lines", parseResult.SkippedLines)
		}
		for _, entry := range entries {
			if !filter.Matches(entry.Project) {
				continue
			}
			if err := pathutil.ValidateSessionID(entry.SessionID); err != nil {
				logutil.Debugf("skipping history entry with invalid session ID: %v", err)
				continue
			}
			meta := SessionMeta{
				SessionID: entry.SessionID,
				Project:   entry.Project,
				Timestamp: entry.Timestamp.Int64(),
			}
			if idx, exists := seen[entry.SessionID]; exists {
				if meta.Timestamp >= sessions[idx].Timestamp {
					sessions[idx] = meta
				}
			} else {
				seen[entry.SessionID] = len(sessions)
				sessions = append(sessions, meta)
			}
		}
	} else if !os.IsNotExist(err) {
		return nil, err
	}

	// Filesystem fallback: scan projects directory for sessions missing from history.
	for _, meta := range ScanProjectDirs(claudeDir, filter) {
		if _, exists := seen[meta.SessionID]; !exists {
			seen[meta.SessionID] = len(sessions)
			sessions = append(sessions, meta)
		}
	}

	// Sort by timestamp descending (most recent first).
	sort.Slice(sessions, func(i, j int) bool {
		return sessions[i].Timestamp > sessions[j].Timestamp
	})

	warnUnmatchedDirs(filter, sessions)

	return &Index{Sessions: sessions}, nil
}

// ScanProjectDirs scans claudeDir/projects/*/ for .jsonl session files and returns
// lightweight SessionMeta entries (no file content is read — enrichment handles that).
// When filter is non-empty, only project directories whose decoded path matches the
// filter are scanned. This is used as a fallback to discover sessions not in history.jsonl.
func ScanProjectDirs(claudeDir string, filter DirFilter) []SessionMeta {
	projectsDir := filepath.Join(claudeDir, "projects")
	projEntries, err := os.ReadDir(projectsDir)
	if err != nil {
		return nil
	}

	var sessions []SessionMeta
	for _, projEntry := range projEntries {
		if !projEntry.IsDir() {
			continue
		}
		dirName := projEntry.Name()
		decoded := claude.DecodeProjectPath(dirName)
		if !filter.Matches(decoded) {
			continue
		}

		files, err := os.ReadDir(filepath.Join(projectsDir, dirName))
		if err != nil {
			continue
		}
		for _, f := range files {
			if f.IsDir() || !strings.HasSuffix(f.Name(), ".jsonl") {
				continue
			}
			sessionID := strings.TrimSuffix(f.Name(), ".jsonl")
			if err := pathutil.ValidateSessionID(sessionID); err != nil {
				continue
			}
			var ts int64
			if info, err := f.Info(); err == nil {
				ts = info.ModTime().UnixMilli()
			}
			sessions = append(sessions, SessionMeta{
				SessionID: sessionID,
				Project:   decoded,
				Timestamp: ts,
			})
		}
	}
	return sessions
}

// DirFilter is a set of substring terms used to filter sessions by their project
// path. Terms combine as OR: a project matches if its path contains any term as a
// substring. A nil or empty DirFilter matches every session, mirroring the
// `sessions --dir` flag and the server's dir/project query params.
type DirFilter []string

// NewDirFilter trims whitespace from each term and drops empties. It returns nil
// when no usable terms remain, which Matches treats as "match everything".
func NewDirFilter(dirs []string) DirFilter {
	var terms DirFilter
	for _, d := range dirs {
		if t := strings.TrimSpace(d); t != "" {
			terms = append(terms, t)
		}
	}
	return terms
}

// Matches reports whether projectPath contains any of the filter's terms as a
// substring. A nil or empty filter matches every path.
func (f DirFilter) Matches(projectPath string) bool {
	if len(f) == 0 {
		return true
	}
	for _, term := range f {
		if strings.Contains(projectPath, term) {
			return true
		}
	}
	return false
}

// warnUnmatchedDirs warns on stderr for each filter term that matched no sessions,
// helping catch typos. A legitimate broad term still matches something and produces
// no warning, so it is never wrongly flagged.
func warnUnmatchedDirs(filter DirFilter, sessions []SessionMeta) {
	for _, term := range filter {
		matched := false
		for _, s := range sessions {
			if strings.Contains(s.Project, term) {
				matched = true
				break
			}
		}
		if !matched {
			logutil.Warnf("no sessions match directory filter %q", term)
		}
	}
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
			sessionPath, err := ResolveFilePath(claudeDir, meta)
			if err != nil {
				logutil.Debugf("session %s has invalid path: %v (removing from index)", meta.SessionID, err)
				results[i] = result{meta: meta, exists: false}
				continue
			}
			if _, err := os.Stat(sessionPath); err != nil {
				logutil.Debugf("session %s has no JSONL file at %s (removing from index)", meta.SessionID, sessionPath)
				results[i] = result{meta: meta, exists: false}
				continue
			}
			results[i] = result{meta: enrichSession(claudeDir, meta, idx.pidChecker), exists: true}
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
// If checker is non-nil, it overrides non-idle states for dead processes.
func enrichSession(claudeDir string, meta SessionMeta, checker ProcessChecker) SessionMeta {
	sessionPath, err := SessionFilePath(claudeDir, meta.Project, meta.SessionID)
	if err != nil {
		return meta
	}
	f, err := os.Open(sessionPath)
	if err != nil {
		return meta
	}
	defer f.Close()

	messages, _, _ := claude.ParseSessionFile(f)
	meta.MessageCount = len(messages)

	var firstTS, lastTS int64
	for _, msg := range messages {
		if ts := msg.Timestamp.Int64(); ts > 0 {
			if firstTS == 0 || ts < firstTS {
				firstTS = ts
			}
			if ts > lastTS {
				lastTS = ts
			}
		}
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
			}
		}
		if msg.Type == claude.MessageTypeCustomTitle && msg.CustomTitle != "" {
			meta.CustomTitle = msg.CustomTitle
		}
		if msg.Type == claude.MessageTypeResult && msg.TotalCostUSD > 0 {
			meta.Usage.CostUSD = msg.TotalCostUSD
		}
	}
	if firstTS > 0 {
		meta.StartTime = firstTS
		meta.EndTime = lastTS
	}
	if firstTS > 0 && lastTS > firstTS {
		meta.DurationMs = lastTS - firstTS
	}

	// Correct project path using cwd from session messages.
	// DecodeProjectPath is lossy (all non-alphanumeric chars map to "-"),
	// so filesystem-discovered sessions get garbled paths. The cwd field
	// in JSONL messages contains the actual project path.
	if meta.FilePath == "" {
		cwdFound := false
		for _, msg := range messages {
			if msg.Cwd != "" {
				meta.Project = msg.Cwd
				cwdFound = true
				break
			}
		}
		// If no cwd was found and the project looks like a lossy decode
		// (decode(encode(project)) == project means it has no special chars,
		// which is what DecodeProjectPath produces), show the raw encoded
		// directory name rather than the garbled path.
		if !cwdFound && claude.DecodeProjectPath(claude.EncodeProjectPath(meta.Project)) == meta.Project {
			if _, statErr := os.Stat(meta.Project); statErr != nil {
				meta.Project = claude.EncodeProjectPath(meta.Project)
			}
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

	// If the process is dead, force idle regardless of message heuristics.
	if checker != nil && meta.ActivityState != ActivityIdle {
		if !checker.IsProcessAlive(meta.SessionID) {
			meta.ActivityState = ActivityIdle
		}
	}

	return meta
}

// SessionFilePath returns the expected path for a session's JSONL file.
// Returns an error if the session ID contains unsafe characters.
func SessionFilePath(claudeDir, project, sessionID string) (string, error) {
	if err := pathutil.ValidateSessionID(sessionID); err != nil {
		return "", err
	}
	encoded := claude.EncodeProjectPath(project)
	return filepath.Join(claudeDir, "projects", encoded, sessionID+".jsonl"), nil
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
		enriched := enrichSession(claudeDir, idx.Sessions[i], idx.pidChecker)
		idx.Sessions[i] = enriched
		return enriched.MessageCount > 0
	}
	return false
}

// AddSessionMeta adds a session to the index if it doesn't already exist.
// Returns true if the session was added.
func (idx *Index) AddSessionMeta(meta SessionMeta) bool {
	if err := pathutil.ValidateSessionID(meta.SessionID); err != nil {
		logutil.Debugf("rejecting session with invalid ID: %v", err)
		return false
	}

	idx.mu.Lock()
	defer idx.mu.Unlock()

	for _, s := range idx.Sessions {
		if s.SessionID == meta.SessionID {
			return false
		}
	}
	idx.Sessions = append([]SessionMeta{meta}, idx.Sessions...)
	return true
}

// AddSession adds a new session from a history entry if it doesn't already exist.
func (idx *Index) AddSession(claudeDir string, entry claude.HistoryEntry) {
	if err := pathutil.ValidateSessionID(entry.SessionID); err != nil {
		logutil.Debugf("rejecting session with invalid ID: %v", err)
		return
	}

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
func ResolveFilePath(claudeDir string, meta SessionMeta) (string, error) {
	if meta.FilePath != "" {
		return meta.FilePath, nil
	}
	return SessionFilePath(claudeDir, meta.Project, meta.SessionID)
}

const maxWalkDepth = 10

// LoadFromPaths builds an Index from explicit file and directory paths.
// Directories are walked recursively for *.jsonl files. Files that fail
// to parse are skipped with a warning on stderr.
// Symlinks are skipped and directory depth is capped at maxWalkDepth.
func LoadFromPaths(paths []string) (*Index, error) {
	var files []string
	for _, p := range paths {
		abs, err := filepath.Abs(p)
		if err != nil {
			logutil.Warnf("cannot resolve path %q: %v", p, err)
			continue
		}
		info, err := os.Lstat(abs)
		if err != nil {
			logutil.Warnf("cannot stat %q: %v", abs, err)
			continue
		}
		if info.Mode()&os.ModeSymlink != 0 {
			logutil.Warnf("skipping symlink %q", abs)
			continue
		}
		if info.IsDir() {
			baseDepth := strings.Count(abs, string(filepath.Separator))
			_ = filepath.WalkDir(abs, func(path string, d os.DirEntry, err error) error {
				if err != nil {
					return nil
				}
				// Skip symlinks to prevent cycles and escaping the directory.
				if d.Type()&os.ModeSymlink != 0 {
					if d.IsDir() {
						return filepath.SkipDir
					}
					return nil
				}
				// Enforce depth limit.
				depth := strings.Count(path, string(filepath.Separator)) - baseDepth
				if d.IsDir() && depth > maxWalkDepth {
					return filepath.SkipDir
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

	messages, _, err := claude.ParseSessionFile(f)
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

	if err := pathutil.ValidateSessionID(sessionID); err != nil {
		return SessionMeta{}, fmt.Errorf("unsafe session ID in %q: %w", path, err)
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

	var firstTS, lastTS int64
	for _, msg := range messages {
		if ts := msg.Timestamp.Int64(); ts > 0 {
			if firstTS == 0 || ts < firstTS {
				firstTS = ts
			}
			if ts > lastTS {
				lastTS = ts
			}
		}
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
			}
		}
		if msg.Type == claude.MessageTypeCustomTitle && msg.CustomTitle != "" {
			meta.CustomTitle = msg.CustomTitle
		}
		if msg.Type == claude.MessageTypeResult && msg.TotalCostUSD > 0 {
			meta.Usage.CostUSD = msg.TotalCostUSD
		}
	}
	if firstTS > 0 {
		meta.StartTime = firstTS
		meta.EndTime = lastTS
	}
	if firstTS > 0 && lastTS > firstTS {
		meta.DurationMs = lastTS - firstTS
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
