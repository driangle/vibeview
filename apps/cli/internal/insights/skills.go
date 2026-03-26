package insights

import (
	"regexp"
	"sort"
	"strings"

	"github.com/driangle/vibeview/internal/claude"
)

var commandNameRe = regexp.MustCompile(`<command-name>/?(.+?)</command-name>`)

type skillAccum struct {
	count       int
	messageUUID string
}

// ExtractSkills extracts skill invocations from Skill tool_use blocks and <command-name> user messages.
func ExtractSkills(messages []claude.Message) []SkillEntry {
	counts := make(map[string]*skillAccum)

	addSkill := func(name, messageUUID string) {
		if existing, ok := counts[name]; ok {
			existing.count++
		} else {
			counts[name] = &skillAccum{count: 1, messageUUID: messageUUID}
		}
	}

	for _, msg := range messages {
		// Skill tool_use blocks
		for _, block := range GetContentBlocks(msg) {
			if block.Type == "tool_use" && block.Name == "Skill" && block.Input != nil {
				skill, _ := block.Input["skill"].(string)
				if skill != "" {
					addSkill(skill, msg.UUID)
				}
			}
		}

		// Slash command messages with <command-name> tags
		if msg.Type == claude.MessageTypeUser && msg.Message != nil {
			text := messageText(msg)
			if match := commandNameRe.FindStringSubmatch(text); match != nil {
				addSkill(match[1], msg.UUID)
			}
		}
	}

	result := make([]SkillEntry, 0, len(counts))
	for name, acc := range counts {
		result = append(result, SkillEntry{
			Name:        name,
			Count:       acc.count,
			MessageUUID: acc.messageUUID,
		})
	}
	sort.Slice(result, func(i, j int) bool {
		return result[i].Count > result[j].Count
	})
	return result
}

func messageText(msg claude.Message) string {
	if msg.Message == nil {
		return ""
	}
	content := msg.Message.Content
	if len(content) == 0 {
		return ""
	}
	var parts []string
	for _, block := range content {
		if block.Type == "text" && block.Text != "" {
			parts = append(parts, block.Text)
		}
	}
	return strings.Join(parts, "\n")
}
