// Package session handles discovery and indexing of Claude Code sessions.
package session

import (
	"os"
	"path/filepath"
	"sort"
	"strings"
	"sync"

	"github.com/driangle/vibeview/internal/claude"
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
	SessionID    string      `json:"sessionId"`
	Project      string      `json:"project"`
	CustomTitle  string      `json:"customTitle"`
	Timestamp    int64       `json:"timestamp"` // epoch millis
	MessageCount int         `json:"messageCount"`
	Model        string      `json:"model"`
	Slug         string      `json:"slug"`
	Usage        UsageTotals `json:"usage"`
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

// Discover reads history.jsonl and builds an index with basic metadata.
// This is fast — it only reads the small history file, not individual session files.
func Discover(claudeDir string) (*Index, error) {
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

	// Deduplicate by session ID, keeping the entry with the latest timestamp.
	seen := make(map[string]int) // sessionID -> index in sessions slice
	var sessions []SessionMeta
	for _, entry := range entries {
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

// Enrich reads each session's JSONL file to populate messageCount, model, usage, and slug.
// It updates sessions in-place and is safe to call concurrently with readers.
func (idx *Index) Enrich(claudeDir string) {
	idx.mu.RLock()
	count := len(idx.Sessions)
	idx.mu.RUnlock()

	for i := 0; i < count; i++ {
		idx.mu.RLock()
		meta := idx.Sessions[i]
		idx.mu.RUnlock()

		enriched := enrichSession(claudeDir, meta)

		idx.mu.Lock()
		if i < len(idx.Sessions) && idx.Sessions[i].SessionID == meta.SessionID {
			idx.Sessions[i] = enriched
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
				meta.Usage.CostUSD += u.CostUSD
			}
		}
		if msg.Type == claude.MessageTypeCustomTitle && msg.CustomTitle != "" {
			meta.CustomTitle = msg.CustomTitle
		}
	}

	if len(messages) > 0 {
		first := messages[0]
		if first.Type == claude.MessageTypeUser && first.Message != nil {
			for _, block := range first.Message.Content {
				if block.Type == "text" && block.Text != "" {
					meta.Slug = truncateSlug(block.Text, 80)
					break
				}
			}
		}
	}

	return meta
}

// SessionFilePath returns the expected path for a session's JSONL file.
func SessionFilePath(claudeDir, project, sessionID string) string {
	encoded := claude.EncodeProjectPath(project)
	return filepath.Join(claudeDir, "projects", encoded, sessionID+".jsonl")
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

// truncateSlug shortens text to maxLen, breaking at a word boundary.
func truncateSlug(text string, maxLen int) string {
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
