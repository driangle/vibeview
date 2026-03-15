// Package session handles discovery and indexing of Claude Code sessions.
package session

import (
	"os"
	"path/filepath"
	"sort"
	"strings"

	"github.com/driangle/vibeview/internal/claude"
)

// SessionMeta holds metadata extracted from a session's history entry and JSONL file.
type SessionMeta struct {
	SessionID    string `json:"sessionId"`
	Project      string `json:"project"`
	Display      string `json:"display"`
	Timestamp    int64  `json:"timestamp"`
	MessageCount int    `json:"messageCount"`
	Model        string `json:"model"`
	Slug         string `json:"slug"`
}

// Index holds all discovered sessions.
type Index struct {
	Sessions []SessionMeta
}

// Discover reads history.jsonl and builds an index of all sessions with metadata.
// Missing or unreadable session files are skipped.
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

	var sessions []SessionMeta
	for _, entry := range entries {
		meta := buildSessionMeta(claudeDir, entry)
		sessions = append(sessions, meta)
	}

	// Sort by timestamp descending (most recent first).
	sort.Slice(sessions, func(i, j int) bool {
		return sessions[i].Timestamp > sessions[j].Timestamp
	})

	return &Index{Sessions: sessions}, nil
}

// buildSessionMeta resolves a session's JSONL file and extracts metadata.
func buildSessionMeta(claudeDir string, entry claude.HistoryEntry) SessionMeta {
	meta := SessionMeta{
		SessionID: entry.SessionID,
		Project:   entry.Project,
		Display:   entry.Display,
		Timestamp: entry.Timestamp,
	}

	sessionPath := SessionFilePath(claudeDir, entry.Project, entry.SessionID)
	f, err := os.Open(sessionPath)
	if err != nil {
		return meta
	}
	defer f.Close()

	messages, _ := claude.ParseSessionFile(f)
	meta.MessageCount = len(messages)

	for _, msg := range messages {
		if msg.Type == claude.MessageTypeAssistant && msg.Message != nil {
			if msg.Message.Model != "" {
				meta.Model = msg.Message.Model
				break
			}
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
	for _, s := range idx.Sessions {
		if s.SessionID == entry.SessionID {
			return
		}
	}
	meta := buildSessionMeta(claudeDir, entry)
	idx.Sessions = append([]SessionMeta{meta}, idx.Sessions...)
}

// FilterByProject returns sessions whose project path contains the given substring.
func (idx *Index) FilterByProject(query string) []SessionMeta {
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
