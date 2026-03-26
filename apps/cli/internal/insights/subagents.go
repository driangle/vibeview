package insights

import (
	"fmt"
	"regexp"

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

			var resultText string
			if result, ok := toolResults[block.ID]; ok {
				resultText = ResolveResultText(result)
			}

			agentID := ""
			if resultText != "" {
				if m := agentIDPattern.FindStringSubmatch(resultText); m != nil {
					agentID = m[1]
				}
			}
			if agentID == "" {
				agentID = "tool_use_" + block.ID
			}

			subagents = append(subagents, SubagentEntry{
				Source:           "tool_use",
				AgentID:          agentID,
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
