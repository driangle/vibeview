package insights

import (
	"github.com/driangle/vibeview/internal/claude"
)

// Extract computes all session insights from parsed messages.
func Extract(messages []claude.Message) SessionInsights {
	toolResults := BuildToolResultMap(messages)

	ins := SessionInsights{
		Tools:     ExtractToolCounts(messages),
		Commands:  ExtractBashCommands(messages),
		Errors:    ExtractErrors(messages, toolResults),
		Files:     ExtractFiles(messages),
		Worktrees: ExtractWorktrees(messages, toolResults),
		Skills:    ExtractSkills(messages),
		Subagents: ExtractSubagents(messages, toolResults),
	}

	// Ensure no nil slices — Go nil slices marshal as JSON null,
	// but the frontend expects empty arrays.
	if ins.Tools == nil {
		ins.Tools = []ToolCount{}
	}
	if ins.Commands == nil {
		ins.Commands = []BashCommand{}
	}
	if ins.Errors == nil {
		ins.Errors = []ErrorEntry{}
	}
	if ins.Files.Categories.Written == nil {
		ins.Files.Categories.Written = []string{}
	}
	if ins.Files.Categories.Read == nil {
		ins.Files.Categories.Read = []string{}
	}
	if ins.Files.Entries == nil {
		ins.Files.Entries = []FileEntry{}
	}
	if ins.Worktrees == nil {
		ins.Worktrees = []WorktreeEntry{}
	}
	if ins.Skills == nil {
		ins.Skills = []SkillEntry{}
	}
	if ins.Subagents == nil {
		ins.Subagents = []SubagentEntry{}
	}

	return ins
}
