// Package claude provides types and utilities for working with Claude Code JSONL data.
package claude

import (
	"bufio"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"strings"
)

// HistoryEntry represents a single line from ~/.claude/history.jsonl.
type HistoryEntry struct {
	SessionID string `json:"sessionId"`
	Project   string `json:"project"`
	Display   string `json:"display"`
	Timestamp int64  `json:"timestamp"`
}

// MessageType identifies the kind of message in a session JSONL file.
type MessageType string

const (
	MessageTypeUser                MessageType = "user"
	MessageTypeAssistant           MessageType = "assistant"
	MessageTypeProgress            MessageType = "progress"
	MessageTypeSystem              MessageType = "system"
	MessageTypeFileHistorySnapshot MessageType = "file-history-snapshot"
)

// Message represents a single line from a session JSONL file.
type Message struct {
	Type       MessageType    `json:"type"`
	UUID       string         `json:"uuid"`
	ParentUUID string         `json:"parentUuid"`
	SessionID  string         `json:"sessionId"`
	Timestamp  int64          `json:"timestamp"`
	Cwd        string         `json:"cwd"`
	GitBranch  string         `json:"gitBranch"`
	IsSidechain bool          `json:"isSidechain"`
	Version    string         `json:"version"`

	// Present on user/assistant messages.
	Message *APIMessage `json:"message,omitempty"`

	// Present on progress messages.
	Data      map[string]any `json:"data,omitempty"`
	ToolUseID string         `json:"toolUseID,omitempty"`

	// Present on file-history-snapshot messages.
	Snapshot map[string]any `json:"snapshot,omitempty"`

	// Present on user tool-result messages.
	ToolUseResult *ToolUseResult `json:"toolUseResult,omitempty"`
}

// APIMessage represents the inner message field on user/assistant messages.
type APIMessage struct {
	Role    string         `json:"role"`
	Model   string         `json:"model,omitempty"`
	Content []ContentBlock `json:"content"`
	Usage   *Usage         `json:"usage,omitempty"`
}

// ContentBlock is a discriminated union of content block types.
// The Type field determines which other fields are populated.
type ContentBlock struct {
	Type string `json:"type"`

	// text block
	Text string `json:"text,omitempty"`

	// thinking block
	Thinking  string `json:"thinking,omitempty"`
	Signature string `json:"signature,omitempty"`

	// tool_use block
	ID    string         `json:"id,omitempty"`
	Name  string         `json:"name,omitempty"`
	Input map[string]any `json:"input,omitempty"`

	// tool_result block
	ToolUseID string `json:"tool_use_id,omitempty"`
	Content   any    `json:"content,omitempty"`
}

// Usage holds token usage data from the API response.
type Usage struct {
	InputTokens              int     `json:"input_tokens"`
	OutputTokens             int     `json:"output_tokens"`
	CacheCreationInputTokens int     `json:"cache_creation_input_tokens"`
	CacheReadInputTokens     int     `json:"cache_read_input_tokens"`
	CostUSD                  float64 `json:"costUSD,omitempty"`
}

// ToolUseResult holds metadata about a tool invocation result.
type ToolUseResult struct {
	DurationMs int      `json:"durationMs"`
	Filenames  []string `json:"filenames"`
	NumFiles   int      `json:"numFiles"`
	Truncated  bool     `json:"truncated"`
}

// ParseHistoryLine parses a single line from history.jsonl.
func ParseHistoryLine(line []byte) (HistoryEntry, error) {
	var entry HistoryEntry
	if err := json.Unmarshal(line, &entry); err != nil {
		return HistoryEntry{}, fmt.Errorf("parse history line: %w", err)
	}
	return entry, nil
}

// ParseMessageLine parses a single line from a session JSONL file.
func ParseMessageLine(line []byte) (Message, error) {
	var msg Message
	if err := json.Unmarshal(line, &msg); err != nil {
		return Message{}, fmt.Errorf("parse message line: %w", err)
	}
	return msg, nil
}

// ParseHistoryFile reads and parses an entire history.jsonl file.
// Malformed lines are skipped and logged to stderr.
func ParseHistoryFile(r io.Reader) ([]HistoryEntry, error) {
	var entries []HistoryEntry
	scanner := bufio.NewScanner(r)
	scanner.Buffer(make([]byte, 0, 1024*1024), 10*1024*1024)
	lineNum := 0
	for scanner.Scan() {
		lineNum++
		line := scanner.Bytes()
		if len(line) == 0 {
			continue
		}
		entry, err := ParseHistoryLine(line)
		if err != nil {
			fmt.Fprintf(os.Stderr, "history.jsonl line %d: %v\n", lineNum, err)
			continue
		}
		entries = append(entries, entry)
	}
	if err := scanner.Err(); err != nil {
		return entries, fmt.Errorf("scan history file: %w", err)
	}
	return entries, nil
}

// ParseSessionFile reads and parses an entire session JSONL file.
// Malformed lines are skipped and logged to stderr.
func ParseSessionFile(r io.Reader) ([]Message, error) {
	var messages []Message
	scanner := bufio.NewScanner(r)
	scanner.Buffer(make([]byte, 0, 1024*1024), 10*1024*1024)
	lineNum := 0
	for scanner.Scan() {
		lineNum++
		line := scanner.Bytes()
		if len(line) == 0 {
			continue
		}
		msg, err := ParseMessageLine(line)
		if err != nil {
			fmt.Fprintf(os.Stderr, "session jsonl line %d: %v\n", lineNum, err)
			continue
		}
		messages = append(messages, msg)
	}
	if err := scanner.Err(); err != nil {
		return messages, fmt.Errorf("scan session file: %w", err)
	}
	return messages, nil
}

// EncodeProjectPath converts a filesystem path to Claude's directory encoding.
// e.g., "/Users/foo/myproject" → "-Users-foo-myproject"
func EncodeProjectPath(path string) string {
	return strings.ReplaceAll(path, "/", "-")
}

// DecodeProjectPath converts a Claude directory name back to a filesystem path.
// e.g., "-Users-foo-myproject" → "/Users/foo/myproject"
func DecodeProjectPath(encoded string) string {
	return strings.ReplaceAll(encoded, "-", "/")
}
