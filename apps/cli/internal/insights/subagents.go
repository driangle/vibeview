package insights

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strings"

	"github.com/driangle/vibeview/internal/claude"
)

var agentIDPattern = regexp.MustCompile(`agentId:\s*([a-f0-9]+)`)

// ExtractSubagents extracts subagent info from agent_progress messages and Agent tool_use blocks.
func ExtractSubagents(messages []claude.Message, toolResults map[string]claude.ContentBlock) []SubagentEntry {
	fromProgress := extractFromAgentProgress(messages)
	fromToolUse := extractFromToolUse(messages, toolResults)

	// Dedup by agentId — prefer agent_progress (richer data)
	seen := make(map[string]bool)
	var result []SubagentEntry

	for _, info := range fromProgress {
		seen[info.AgentID] = true
		result = append(result, info)
	}
	for _, info := range fromToolUse {
		if !seen[info.AgentID] {
			seen[info.AgentID] = true
			result = append(result, info)
		}
	}

	return result
}

func extractFromAgentProgress(messages []claude.Message) []SubagentEntry {
	type agentData struct {
		firstUUID string
		prompt    string
		turnCount int
	}
	agents := make(map[string]*agentData)
	var order []string

	for _, msg := range messages {
		if msg.Type != claude.MessageTypeProgress {
			continue
		}
		dataType, _ := msg.Data["type"].(string)
		if dataType != "agent_progress" {
			continue
		}
		agentID := fmt.Sprintf("%v", msg.Data["agentId"])
		if agentID == "" || agentID == "<nil>" {
			continue
		}

		if existing, ok := agents[agentID]; ok {
			existing.turnCount++
		} else {
			prompt, _ := msg.Data["prompt"].(string)
			agents[agentID] = &agentData{
				firstUUID: msg.UUID,
				prompt:    prompt,
				turnCount: 1,
			}
			order = append(order, agentID)
		}
	}

	result := make([]SubagentEntry, 0, len(order))
	for _, agentID := range order {
		data := agents[agentID]
		result = append(result, SubagentEntry{
			Source:           "agent_progress",
			AgentID:          agentID,
			Prompt:           data.prompt,
			FirstMessageUUID: data.firstUUID,
			TurnCount:        data.turnCount,
		})
	}
	return result
}

func extractFromToolUse(messages []claude.Message, toolResults map[string]claude.ContentBlock) []SubagentEntry {
	var subagents []SubagentEntry

	for _, msg := range messages {
		for _, block := range GetContentBlocks(msg) {
			if block.Type != "tool_use" || block.Name != "Agent" || block.ID == "" {
				continue
			}

			input := block.Input
			prompt, _ := input["prompt"].(string)
			description, _ := input["description"].(string)
			agentType, _ := input["subagent_type"].(string)

			var resultText string
			agentID := ""
			if result, ok := toolResults[block.ID]; ok {
				resultText = ResolveResultText(result)
				// Search all text blocks in the result for the agentId pattern,
				// since agentId may appear in a different block than the first.
				agentID = extractAgentIDFromResult(result)
			}
			if agentID == "" {
				agentID = "tool_use_" + block.ID
			}

			subagents = append(subagents, SubagentEntry{
				Source:           "tool_use",
				AgentID:          agentID,
				AgentType:        agentType,
				Prompt:           prompt,
				Description:      description,
				FirstMessageUUID: msg.UUID,
				ToolUseID:        block.ID,
				ResultText:       resultText,
			})
		}
	}

	return subagents
}

// extractAgentIDFromResult searches all text blocks in a tool result for an agentId pattern.
func extractAgentIDFromResult(block claude.ContentBlock) string {
	if block.Content == nil {
		return ""
	}
	// Single string content
	if s, ok := block.Content.(string); ok {
		if m := agentIDPattern.FindStringSubmatch(s); m != nil {
			return m[1]
		}
		return ""
	}
	// Array of content blocks — check each text block
	if arr, ok := block.Content.([]any); ok {
		for _, item := range arr {
			m, ok := item.(map[string]any)
			if !ok {
				continue
			}
			if m["type"] == "text" {
				if text, ok := m["text"].(string); ok {
					if match := agentIDPattern.FindStringSubmatch(text); match != nil {
						return match[1]
					}
				}
			}
		}
	}
	return ""
}

// ResolveSubagentIDs matches tool_use-based subagent entries (which have synthetic
// "tool_use_<id>" agent IDs) to real agent file IDs by scanning the subagent directory
// and matching on description. This allows the frontend to request the correct agent file.
func ResolveSubagentIDs(entries []SubagentEntry, sessionDir string) {
	subagentsDir := filepath.Join(sessionDir, "subagents")
	files, err := os.ReadDir(subagentsDir)
	if err != nil {
		return
	}

	// Build map from description -> meta using meta files.
	type agentMeta struct {
		ID        string
		AgentType string
	}
	descToMeta := make(map[string]agentMeta)
	idToType := make(map[string]string)
	for _, f := range files {
		name := f.Name()
		if !strings.HasPrefix(name, "agent-") || !strings.HasSuffix(name, ".meta.json") {
			continue
		}
		agentID := strings.TrimSuffix(strings.TrimPrefix(name, "agent-"), ".meta.json")

		data, err := os.ReadFile(filepath.Join(subagentsDir, name))
		if err != nil {
			continue
		}
		var meta struct {
			Description string `json:"description"`
			AgentType   string `json:"agentType"`
		}
		if json.Unmarshal(data, &meta) == nil {
			if meta.Description != "" {
				descToMeta[meta.Description] = agentMeta{ID: agentID, AgentType: meta.AgentType}
			}
			if meta.AgentType != "" {
				idToType[agentID] = meta.AgentType
			}
		}
	}

	for i := range entries {
		// Resolve synthetic tool_use_ IDs to real agent IDs.
		if strings.HasPrefix(entries[i].AgentID, "tool_use_") {
			if m, ok := descToMeta[entries[i].Description]; ok {
				entries[i].AgentID = m.ID
				if entries[i].AgentType == "" {
					entries[i].AgentType = m.AgentType
				}
			}
		}
		// Backfill agentType from meta for entries that don't have it (e.g. agent_progress).
		if entries[i].AgentType == "" {
			if t, ok := idToType[entries[i].AgentID]; ok {
				entries[i].AgentType = t
			}
		}
	}
}
