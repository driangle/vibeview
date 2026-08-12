package sessiondetail

import (
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/driangle/vibeview/apps/lib/claude"
	"github.com/driangle/vibeview/apps/lib/insights"
	"github.com/driangle/vibeview/apps/lib/pathutil"
)

// TimestampISO renders a millisecond timestamp as RFC 3339, or "" when unset.
func TimestampISO(ms int64) string {
	if ms == 0 {
		return ""
	}
	return time.UnixMilli(ms).UTC().Format(time.RFC3339)
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
