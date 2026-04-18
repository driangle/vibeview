package main

import (
	"encoding/json"
	"fmt"
	"io"
	"os"
	"os/exec"
	"strings"

	"github.com/driangle/vibeview/internal/claude"
	"github.com/driangle/vibeview/internal/insights"
	"github.com/driangle/vibeview/internal/logutil"
	"github.com/driangle/vibeview/internal/session"
	"github.com/spf13/cobra"
)

type showOptions struct {
	thinking bool
	verbose  bool
}

func showCmd(claudeDir *string, logLevel *string) *cobra.Command {
	var thinking bool
	var verbose bool
	var jsonOutput bool
	var noColor bool

	cmd := &cobra.Command{
		Use:   "show <session-id>",
		Short: "Display a session conversation as readable text",
		Long: `Render a session's full conversation as compact, human-readable text.

Shows user and assistant messages with role labels, tool calls as
one-line summaries, and omits raw JSON, token counts, and metadata.

Input can be a session ID (full or prefix match) or a .jsonl file path.

Examples:
  vibeview show 877fff1e-80c9-4d20-a600-f278eb2c7bdc
  vibeview show 877fff
  vibeview show --verbose 877fff1e
  vibeview show --thinking 877fff1e
  vibeview show --json 877fff1e
  vibeview show session.jsonl`,
		Args: cobra.ExactArgs(1),
		Run: func(cmd *cobra.Command, args []string) {
			logutil.SetLevel(logutil.ParseLevel(*logLevel))

			if noColor {
				colorEnabled = false
			}

			target := args[0]
			messages, err := resolveSessionMessages(*claudeDir, target)
			if err != nil {
				fmt.Fprintf(os.Stderr, "error: %v\n", err)
				os.Exit(1)
			}

			if jsonOutput {
				filtered := filterConversationMessages(messages)
				enc := json.NewEncoder(os.Stdout)
				enc.SetIndent("", "  ")
				if err := enc.Encode(filtered); err != nil {
					fmt.Fprintf(os.Stderr, "error: %v\n", err)
					os.Exit(1)
				}
				return
			}

			opts := showOptions{thinking: thinking, verbose: verbose}
			withPager(func(w io.Writer) {
				renderShow(w, messages, opts)
			})
		},
	}

	cmd.Flags().BoolVar(&thinking, "thinking", false, "include thinking blocks")
	cmd.Flags().BoolVarP(&verbose, "verbose", "v", false, "expand tool calls with full input/output")
	cmd.Flags().BoolVar(&jsonOutput, "json", false, "output raw messages as JSON")
	cmd.Flags().BoolVar(&noColor, "no-color", false, "strip ANSI color codes")

	return cmd
}

// resolveSessionMessages loads messages for a session ID (exact or prefix) or file path.
func resolveSessionMessages(claudeDir, target string) ([]claude.Message, error) {
	// Try as file path first.
	if info, err := os.Stat(target); err == nil && !info.IsDir() {
		return parseSessionFromPath(target)
	}

	// Discover sessions and try exact match, then prefix match.
	idx, err := session.Discover(claudeDir, nil)
	if err != nil {
		return nil, fmt.Errorf("discovering sessions: %w", err)
	}

	meta := idx.FindSession(target)
	if meta == nil {
		m, prefixErr := idx.FindSessionByPrefix(target)
		if prefixErr != nil {
			return nil, prefixErr
		}
		meta = m
	}

	path, err := session.ResolveFilePath(claudeDir, *meta)
	if err != nil {
		return nil, fmt.Errorf("resolving session path: %w", err)
	}

	return parseSessionFromPath(path)
}

func parseSessionFromPath(path string) ([]claude.Message, error) {
	f, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	defer f.Close()

	messages, _, err := claude.ParseSessionFile(f)
	if err != nil {
		return nil, err
	}
	return messages, nil
}

// filterConversationMessages returns only user and assistant messages (non-meta).
func filterConversationMessages(messages []claude.Message) []claude.Message {
	var filtered []claude.Message
	for _, msg := range messages {
		if msg.IsMeta {
			continue
		}
		if msg.Type == claude.MessageTypeUser || msg.Type == claude.MessageTypeAssistant {
			filtered = append(filtered, msg)
		}
	}
	return filtered
}

// renderShow renders the conversation as human-readable text.
func renderShow(w io.Writer, messages []claude.Message, opts showOptions) {
	toolResults := insights.BuildToolResultMap(messages)

	for _, msg := range messages {
		if msg.IsMeta || msg.IsSidechain {
			continue
		}

		switch msg.Type {
		case claude.MessageTypeUser:
			renderUserMessage(w, msg, toolResults)
		case claude.MessageTypeAssistant:
			renderAssistantMessage(w, msg, toolResults, opts)
		}
	}
}

func renderUserMessage(w io.Writer, msg claude.Message, toolResults map[string]claude.ContentBlock) {
	if msg.Message == nil {
		return
	}

	// Check if this message has any renderable text content.
	hasText := false
	for _, block := range msg.Message.Content {
		if block.Type == "text" && block.Text != "" {
			hasText = true
			break
		}
	}
	if !hasText {
		return
	}

	fmt.Fprintln(w)
	fmt.Fprintln(w, bold(cyan("--- User ---")))
	for _, block := range msg.Message.Content {
		if block.Type == "text" && block.Text != "" {
			fmt.Fprintln(w, block.Text)
		}
	}
}

func renderAssistantMessage(w io.Writer, msg claude.Message, toolResults map[string]claude.ContentBlock, opts showOptions) {
	if msg.Message == nil {
		return
	}

	// Check if this message has any renderable content.
	hasContent := false
	for _, block := range msg.Message.Content {
		switch block.Type {
		case "text":
			if block.Text != "" {
				hasContent = true
			}
		case "tool_use":
			hasContent = true
		case "thinking":
			if opts.thinking && block.Thinking != "" {
				hasContent = true
			}
		}
	}
	if !hasContent {
		return
	}

	fmt.Fprintln(w)
	fmt.Fprintln(w, bold(cyan("--- Assistant ---")))

	for _, block := range msg.Message.Content {
		switch block.Type {
		case "text":
			if block.Text != "" {
				fmt.Fprintln(w, block.Text)
			}

		case "thinking":
			if opts.thinking && block.Thinking != "" {
				fmt.Fprintln(w, dim("[Thinking]"))
				fmt.Fprintln(w, dim(block.Thinking))
			}

		case "tool_use":
			result, hasResult := toolResults[block.ID]
			summary := formatToolSummary(block, result, hasResult)
			fmt.Fprintln(w, summary)

			if opts.verbose {
				renderVerboseToolCall(w, block, result, hasResult)
			}
		}
	}
}

// formatToolSummary renders a tool call as a compact one-line summary.
func formatToolSummary(block claude.ContentBlock, result claude.ContentBlock, hasResult bool) string {
	toolName := block.Name
	keyArg := extractToolKeyArg(block)

	var status string
	if !hasResult {
		status = dim("-")
	} else if result.IsError {
		status = red("✗")
	} else {
		status = "✓"
	}

	var line string
	if keyArg != "" {
		line = fmt.Sprintf("  %s %s %s", dim("[Tool]"), bold(toolName), keyArg)
	} else {
		line = fmt.Sprintf("  %s %s", dim("[Tool]"), bold(toolName))
	}
	return line + " " + status
}

// extractToolKeyArg returns the most informative argument for a tool call.
func extractToolKeyArg(block claude.ContentBlock) string {
	switch block.Name {
	case "Read", "Edit", "Write":
		if fp, ok := block.Input["file_path"].(string); ok {
			return fp
		}
	case "Bash":
		if cmd, ok := block.Input["command"].(string); ok {
			return truncateArg(fmt.Sprintf("%q", cmd), 60)
		}
	case "Grep", "Glob":
		if p, ok := block.Input["pattern"].(string); ok {
			return truncateArg(fmt.Sprintf("%q", p), 60)
		}
	case "Agent":
		if desc, ok := block.Input["description"].(string); ok && desc != "" {
			return truncateArg(fmt.Sprintf("%q", desc), 50)
		}
		if prompt, ok := block.Input["prompt"].(string); ok {
			return truncateArg(fmt.Sprintf("%q", prompt), 50)
		}
	case "Skill":
		if s, ok := block.Input["skill"].(string); ok {
			return s
		}
	}
	return ""
}

func truncateArg(s string, maxLen int) string {
	if len(s) <= maxLen {
		return s
	}
	return s[:maxLen-3] + "..."
}

func renderVerboseToolCall(w io.Writer, block claude.ContentBlock, result claude.ContentBlock, hasResult bool) {
	// Show input.
	if len(block.Input) > 0 {
		fmt.Fprintln(w, dim("    Input:"))
		for k, v := range block.Input {
			val := fmt.Sprintf("%v", v)
			if len(val) > 200 {
				val = val[:200] + "..."
			}
			fmt.Fprintf(w, "      %s: %s\n", k, val)
		}
	}

	// Show output.
	if hasResult {
		text := insights.ResolveResultText(result)
		if text != "" {
			if len(text) > 500 {
				text = text[:500] + "..."
			}
			label := "    Output:"
			if result.IsError {
				label = "    " + red("Error:")
			}
			fmt.Fprintln(w, dim(label))
			for _, line := range strings.SplitAfter(text, "\n") {
				if line != "" {
					fmt.Fprint(w, "      "+line)
				}
			}
			fmt.Fprintln(w)
		}
	}
}

// withPager wraps output in a pager if stdout is a terminal.
func withPager(fn func(w io.Writer)) {
	if !isTTY() {
		fn(os.Stdout)
		return
	}

	pager := os.Getenv("PAGER")
	if pager == "" {
		pager = "less -R"
	}

	parts := strings.Fields(pager)
	cmd := exec.Command(parts[0], parts[1:]...)
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	pipe, err := cmd.StdinPipe()
	if err != nil {
		fn(os.Stdout)
		return
	}

	if err := cmd.Start(); err != nil {
		fn(os.Stdout)
		return
	}

	fn(pipe)
	pipe.Close()
	_ = cmd.Wait()
}

func isTTY() bool {
	fi, err := os.Stdout.Stat()
	if err != nil {
		return false
	}
	return fi.Mode()&os.ModeCharDevice != 0
}
