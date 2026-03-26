package insights

import (
	"github.com/driangle/vibeview/internal/claude"
	"github.com/driangle/vibeview/internal/redact"
)

// ExtractBashCommands finds all Bash tool_use blocks and extracts the command string.
func ExtractBashCommands(messages []claude.Message) []BashCommand {
	var commands []BashCommand

	for _, msg := range messages {
		for _, block := range GetContentBlocks(msg) {
			if block.Type != "tool_use" || block.Name != "Bash" || block.ID == "" {
				continue
			}
			cmd, _ := block.Input["command"].(string)
			if cmd == "" {
				continue
			}
			commands = append(commands, BashCommand{
				Command:     redact.RedactSecrets(cmd),
				ToolUseID:   block.ID,
				MessageUUID: msg.UUID,
			})
		}
	}

	return commands
}
