package session

import (
	"encoding/json"
	"os"
	"path/filepath"
	"sort"
	"strings"

	"github.com/driangle/vibeview/apps/lib/claude"
)

// SubagentInfo describes a single subagent transcript spawned by a session.
// It is derived by enumerating the session's subagents/ directory rather than
// by scanning the parent transcript, so it reflects the on-disk agent files.
type SubagentInfo struct {
	AgentID      string `json:"agentId"`
	AgentType    string `json:"agentType,omitempty"`
	Description  string `json:"description,omitempty"`
	MessageCount int    `json:"messageCount"`
	TurnCount    int    `json:"turnCount"` // assistant messages in the transcript
	StartTime    int64  `json:"startTime"` // first message timestamp (epoch millis)
	FilePath     string `json:"-"`
}

// SubagentsDir returns the directory that holds a session's subagent
// transcripts. Subagents live in a directory named after the session ID,
// sitting beside the session's own {sessionID}.jsonl file.
func SubagentsDir(claudeDir string, meta SessionMeta) (string, error) {
	jsonlPath, err := ResolveFilePath(claudeDir, meta)
	if err != nil {
		return "", err
	}
	sessionDir := strings.TrimSuffix(jsonlPath, ".jsonl")
	return filepath.Join(sessionDir, "subagents"), nil
}

// ListSubagents enumerates the agent-*.jsonl transcripts in a session's
// subagents/ directory, reading each sibling .meta.json for agentType and
// description and parsing the transcript for message/turn counts.
//
// It returns an empty slice (not an error) when the session has no subagents
// directory. Individual unreadable agent files are skipped.
func ListSubagents(claudeDir string, meta SessionMeta) ([]SubagentInfo, error) {
	dir, err := SubagentsDir(claudeDir, meta)
	if err != nil {
		return nil, err
	}

	entries, err := os.ReadDir(dir)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, nil
		}
		return nil, err
	}

	var infos []SubagentInfo
	for _, e := range entries {
		name := e.Name()
		if e.IsDir() || !strings.HasPrefix(name, "agent-") || !strings.HasSuffix(name, ".jsonl") {
			continue
		}
		agentID := strings.TrimSuffix(strings.TrimPrefix(name, "agent-"), ".jsonl")
		info := SubagentInfo{
			AgentID:  agentID,
			FilePath: filepath.Join(dir, name),
		}

		readSubagentMeta(dir, agentID, &info)
		countSubagentMessages(info.FilePath, &info)

		infos = append(infos, info)
	}

	// Order by spawn time (first message), falling back to agent ID for
	// deterministic output when timestamps are missing.
	sort.Slice(infos, func(i, j int) bool {
		if infos[i].StartTime != infos[j].StartTime {
			return infos[i].StartTime < infos[j].StartTime
		}
		return infos[i].AgentID < infos[j].AgentID
	})

	return infos, nil
}

// readSubagentMeta loads agentType/description from the agent's .meta.json.
func readSubagentMeta(dir, agentID string, info *SubagentInfo) {
	metaPath := filepath.Join(dir, "agent-"+agentID+".meta.json")
	data, err := os.ReadFile(metaPath)
	if err != nil {
		return
	}
	var meta struct {
		AgentType   string `json:"agentType"`
		Description string `json:"description"`
	}
	if json.Unmarshal(data, &meta) == nil {
		info.AgentType = meta.AgentType
		info.Description = meta.Description
	}
}

// countSubagentMessages parses an agent transcript to populate message/turn
// counts and the first message timestamp.
func countSubagentMessages(path string, info *SubagentInfo) {
	f, err := os.Open(path)
	if err != nil {
		return
	}
	defer f.Close()

	messages, _, err := claude.ParseSessionFile(f)
	if err != nil {
		return
	}
	info.MessageCount = len(messages)
	for _, msg := range messages {
		if msg.Type == claude.MessageTypeAssistant {
			info.TurnCount++
		}
		if ts := msg.Timestamp.Int64(); ts > 0 {
			if info.StartTime == 0 || ts < info.StartTime {
				info.StartTime = ts
			}
		}
	}
}
