package insights

import (
	"fmt"
	"regexp"

	"github.com/driangle/vibeview/internal/claude"
	"github.com/driangle/vibeview/internal/redact"
)

var worktreePathRe = regexp.MustCompile(`worktree at ([^\s]+)`)
var worktreeBranchRe = regexp.MustCompile(`on branch ([^\s.]+)`)

// ExtractWorktrees finds EnterWorktree tool_use blocks and parses worktree details from results.
func ExtractWorktrees(messages []claude.Message, toolResults map[string]claude.ContentBlock) []WorktreeEntry {
	var worktrees []WorktreeEntry

	for _, msg := range messages {
		for _, block := range GetContentBlocks(msg) {
			if block.Type != "tool_use" || block.Name != "EnterWorktree" || block.ID == "" {
				continue
			}

			name := fmt.Sprintf("%v", block.Input["name"])
			if name == "<nil>" {
				name = ""
			}

			var path, branch string
			if result, ok := toolResults[block.ID]; ok {
				text, _ := result.Content.(string)
				if m := worktreePathRe.FindStringSubmatch(text); m != nil {
					path = m[1]
				}
				if m := worktreeBranchRe.FindStringSubmatch(text); m != nil {
					branch = m[1]
				}
			}

			worktrees = append(worktrees, WorktreeEntry{
				Name:        name,
				Path:        redact.MaskHomePath(path),
				Branch:      branch,
				MessageUUID: msg.UUID,
			})
		}
	}

	return worktrees
}
