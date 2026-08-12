// Package sessiondetail reads a Claude Code session from disk into the
// representation the vibeview UI renders: messages, insights, timeline and
// usage totals.
//
// It is the single place that assembles that payload. The web server serves it
// over HTTP; sessionhtml embeds it in a static page. Both show the same session
// the same way.
package sessiondetail

import (
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
	"strings"

	"github.com/driangle/vibeview/apps/lib/claude"
	"github.com/driangle/vibeview/apps/lib/insights"
	"github.com/driangle/vibeview/apps/lib/logutil"
	"github.com/driangle/vibeview/apps/lib/messagedto"
	"github.com/driangle/vibeview/apps/lib/pathutil"
	"github.com/driangle/vibeview/apps/lib/redact"
	"github.com/driangle/vibeview/apps/lib/session"
	"github.com/driangle/vibeview/apps/lib/timeline"
)

var (
	// ErrInvalidSessionPath means the session resolved to a path outside the
	// Claude directory, or to no path at all.
	ErrInvalidSessionPath = errors.New("invalid session path")
	// ErrSessionFileNotFound means the session file could not be opened.
	ErrSessionFileNotFound = errors.New("session file not found")
	// ErrSessionUnreadable means not a single message could be parsed.
	ErrSessionUnreadable = errors.New("failed to parse session")
	// ErrInvalidAgentID means the agent ID could not be used to build a path.
	ErrInvalidAgentID = errors.New("invalid agent ID")
	// ErrSubagentNotFound means the subagent file could not be opened.
	ErrSubagentNotFound = errors.New("subagent session not found")
	// ErrSubagentUnreadable means not a single subagent message could be parsed.
	ErrSubagentUnreadable = errors.New("failed to parse subagent session")
)

// Session is the representation of a session in list responses.
type Session struct {
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

// Detail is a single session with its messages, insights and timeline.
type Detail struct {
	Session
	FilePath     string                     `json:"filePath"`
	Messages     []messagedto.Message       `json:"messages"`
	Insights     *insights.SessionInsights  `json:"insights,omitempty"`
	Timeline     *timeline.TimelineResponse `json:"timeline,omitempty"`
	SkippedLines int                        `json:"skippedLines,omitempty"`
}

// SubagentDetail is one subagent conversation spawned by a session.
type SubagentDetail struct {
	AgentID      string                    `json:"agentId"`
	AgentType    string                    `json:"agentType,omitempty"`
	Description  string                    `json:"description,omitempty"`
	Messages     []messagedto.Message      `json:"messages"`
	Insights     *insights.SessionInsights `json:"insights,omitempty"`
	SkippedLines int                       `json:"skippedLines,omitempty"`
}

// FromMeta converts session metadata to its API representation.
func FromMeta(m session.SessionMeta) Session {
	return Session{
		ID:            m.SessionID,
		Dir:           m.Project,
		CustomTitle:   m.CustomTitle,
		Timestamp:     TimestampISO(m.Timestamp),
		MessageCount:  m.MessageCount,
		Model:         m.Model,
		Slug:          m.Slug,
		Usage:         m.Usage,
		ActivityState: m.ActivityState,
	}
}

// Build assembles the full payload for one session.
func Build(claudeDir string, meta session.SessionMeta) (Detail, error) {
	path, err := resolveFile(claudeDir, meta)
	if err != nil {
		return Detail{}, err
	}

	messages, parseResult, err := parseFile(path, "session "+meta.SessionID, ErrSessionUnreadable)
	if err != nil {
		return Detail{}, err
	}

	extracted := insights.Extract(messages)
	sessionDir := strings.TrimSuffix(path, ".jsonl")
	insights.ResolveSubagentIDs(extracted.Subagents, sessionDir)
	// Timeline strings (prompt previews, commands, file paths) are redacted at
	// the source by timeline.Build, matching the rest of the payload.
	tl := timeline.Build(messages)

	return Detail{
		Session:      FromMeta(meta),
		FilePath:     redact.MaskHomePath(path),
		Messages:     toMessages(messages),
		Insights:     &extracted,
		Timeline:     &tl,
		SkippedLines: parseResult.SkippedLines,
	}, nil
}

// BuildSubagent assembles the payload for one subagent conversation of a
// session. Subagent files live at {session-dir}/subagents/agent-{agentId}.jsonl.
func BuildSubagent(claudeDir string, meta session.SessionMeta, agentID string) (SubagentDetail, error) {
	// Reject any agent ID that could walk outside the subagents directory before
	// it is interpolated into a filesystem path.
	if err := pathutil.ValidateAgentID(agentID); err != nil {
		return SubagentDetail{}, ErrInvalidAgentID
	}

	sessionPath, err := resolveFile(claudeDir, meta)
	if err != nil {
		return SubagentDetail{}, err
	}

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
		return SubagentDetail{}, ErrSubagentNotFound
	}

	messages, parseResult, err := parseFile(agentPath, "subagent "+agentID, ErrSubagentUnreadable)
	if err != nil {
		if errors.Is(err, ErrSessionFileNotFound) {
			return SubagentDetail{}, ErrSubagentNotFound
		}
		return SubagentDetail{}, err
	}

	agentType, description := readSubagentMeta(subagentsDir, agentID)
	extracted := insights.Extract(messages)

	return SubagentDetail{
		AgentID:      agentID,
		AgentType:    agentType,
		Description:  description,
		Messages:     toMessages(messages),
		Insights:     &extracted,
		SkippedLines: parseResult.SkippedLines,
	}, nil
}

// resolveFile returns the contained on-disk path of a session.
func resolveFile(claudeDir string, meta session.SessionMeta) (string, error) {
	path, err := session.ResolveFilePath(claudeDir, meta)
	if err != nil {
		return "", ErrInvalidSessionPath
	}
	// Contain the resolved path so a session file that symlinks outside the
	// Claude directory is not followed on read — parity with the tailer path.
	if _, err := pathutil.SafeResolve(path, claudeDir); err != nil {
		return "", ErrInvalidSessionPath
	}
	return path, nil
}

// parseFile reads and parses a session file. A read error after some messages
// were parsed is recoverable: the partial content is returned rather than
// discarded. `unreadable` is returned only when nothing could be parsed.
func parseFile(path, label string, unreadable error) ([]claude.Message, claude.ParseResult, error) {
	f, err := os.Open(path)
	if err != nil {
		return nil, claude.ParseResult{}, ErrSessionFileNotFound
	}
	defer f.Close()

	messages, parseResult, err := claude.ParseSessionFile(f)
	if err != nil {
		if len(messages) == 0 {
			return nil, claude.ParseResult{}, unreadable
		}
		logutil.Warnf("%s: read error after %d messages, rendering partial content: %v", label, len(messages), err)
	}
	return messages, parseResult, nil
}

func toMessages(messages []claude.Message) []messagedto.Message {
	responses := make([]messagedto.Message, 0, len(messages))
	for _, msg := range messages {
		responses = append(responses, messagedto.From(msg))
	}
	return responses
}

// readSubagentMeta reads the optional meta file for agent type and description.
// A missing or unsafe meta path is not fatal — the conversation still renders.
func readSubagentMeta(subagentsDir, agentID string) (agentType, description string) {
	metaPath, err := safeSubagentPath(subagentsDir, agentID, ".meta.json")
	if err != nil {
		return "", ""
	}
	metaBytes, err := os.ReadFile(metaPath)
	if err != nil {
		return "", ""
	}
	var metaData struct {
		AgentType   string `json:"agentType"`
		Description string `json:"description"`
	}
	if json.Unmarshal(metaBytes, &metaData) != nil {
		return "", ""
	}
	return metaData.AgentType, metaData.Description
}
