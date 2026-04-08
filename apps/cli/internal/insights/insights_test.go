package insights

import (
	"strings"
	"testing"

	"github.com/driangle/vibeview/internal/claude"
)

// --- helpers to build test messages ---

func assistantMsg(uuid string, ts int64, blocks ...claude.ContentBlock) claude.Message {
	return claude.Message{
		Type:      claude.MessageTypeAssistant,
		UUID:      uuid,
		Timestamp: claude.Timestamp(ts),
		Message:   &claude.APIMessage{Role: "assistant", Content: blocks},
	}
}

func userMsg(uuid string, ts int64, blocks ...claude.ContentBlock) claude.Message {
	return claude.Message{
		Type:      claude.MessageTypeUser,
		UUID:      uuid,
		Timestamp: claude.Timestamp(ts),
		Message:   &claude.APIMessage{Role: "user", Content: blocks},
	}
}

func metaUserMsg(uuid string, ts int64, blocks ...claude.ContentBlock) claude.Message {
	return claude.Message{
		Type:      claude.MessageTypeUser,
		UUID:      uuid,
		Timestamp: claude.Timestamp(ts),
		IsMeta:    true,
		Message:   &claude.APIMessage{Role: "user", Content: blocks},
	}
}

func progressMsg(uuid string, data map[string]any) claude.Message {
	return claude.Message{
		Type: claude.MessageTypeProgress,
		UUID: uuid,
		Data: data,
	}
}

func toolUse(id, name string, input map[string]any) claude.ContentBlock {
	return claude.ContentBlock{Type: "tool_use", ID: id, Name: name, Input: input}
}

func toolResult(toolUseID string, content any, isError bool) claude.ContentBlock {
	return claude.ContentBlock{Type: "tool_result", ToolUseID: toolUseID, Content: content, IsError: isError}
}

func textBlock(text string) claude.ContentBlock {
	return claude.ContentBlock{Type: "text", Text: text}
}

// --- TestExtractBashCommands ---

func TestExtractBashCommands(t *testing.T) {
	messages := []claude.Message{
		assistantMsg("m1", 1000,
			toolUse("tu-1", "Bash", map[string]any{"command": "ls -la"}),
			toolUse("tu-2", "Read", map[string]any{"file_path": "/tmp/f"}), // not Bash
			toolUse("", "Bash", map[string]any{"command": "echo hi"}),      // no ID
			toolUse("tu-3", "Bash", map[string]any{}),                      // empty command
			toolUse("tu-4", "Bash", map[string]any{"command": "go test"}),
		),
		{Type: claude.MessageTypeSystem, UUID: "m2"}, // no message field
	}

	cmds := ExtractBashCommands(messages)

	if len(cmds) != 2 {
		t.Fatalf("expected 2 commands, got %d", len(cmds))
	}
	if cmds[0].Command != "ls -la" || cmds[0].ToolUseID != "tu-1" || cmds[0].MessageUUID != "m1" {
		t.Errorf("unexpected first command: %+v", cmds[0])
	}
	if cmds[1].Command != "go test" || cmds[1].ToolUseID != "tu-4" {
		t.Errorf("unexpected second command: %+v", cmds[1])
	}
}

func TestExtractBashCommands_Empty(t *testing.T) {
	cmds := ExtractBashCommands(nil)
	if cmds != nil {
		t.Errorf("expected nil for empty input, got %v", cmds)
	}
}

// --- TestExtractErrors ---

func TestExtractErrors(t *testing.T) {
	messages := []claude.Message{
		assistantMsg("m1", 1000,
			toolUse("tu-1", "Bash", map[string]any{"command": "fail"}),
			toolUse("tu-2", "Read", map[string]any{"file_path": "/x"}),
			toolUse("tu-3", "Grep", map[string]any{"pattern": "x"}),
		),
	}

	toolResults := map[string]claude.ContentBlock{
		"tu-1": {Type: "tool_result", ToolUseID: "tu-1", Content: "command failed", IsError: true},
		"tu-2": {Type: "tool_result", ToolUseID: "tu-2", Content: "file contents", IsError: false},
		// tu-3 has no result
	}

	errors := ExtractErrors(messages, toolResults)

	if len(errors) != 1 {
		t.Fatalf("expected 1 error, got %d", len(errors))
	}
	if errors[0].ToolName != "Bash" || errors[0].Snippet != "command failed" || errors[0].MessageUUID != "m1" {
		t.Errorf("unexpected error: %+v", errors[0])
	}
}

func TestExtractErrors_Truncation(t *testing.T) {
	longText := strings.Repeat("x", 300)
	messages := []claude.Message{
		assistantMsg("m1", 1000,
			toolUse("tu-1", "Bash", map[string]any{"command": "fail"}),
		),
	}
	toolResults := map[string]claude.ContentBlock{
		"tu-1": {Type: "tool_result", ToolUseID: "tu-1", Content: longText, IsError: true},
	}

	errors := ExtractErrors(messages, toolResults)

	if len(errors) != 1 {
		t.Fatalf("expected 1 error, got %d", len(errors))
	}
	if len(errors[0].Snippet) != 200 {
		t.Errorf("expected snippet truncated to 200, got %d", len(errors[0].Snippet))
	}
}

func TestExtractErrors_SkipsNoIDOrName(t *testing.T) {
	messages := []claude.Message{
		assistantMsg("m1", 1000,
			toolUse("", "Bash", map[string]any{}), // no ID
			toolUse("tu-1", "", map[string]any{}), // no name
		),
	}
	toolResults := map[string]claude.ContentBlock{
		"tu-1": {Type: "tool_result", ToolUseID: "tu-1", Content: "err", IsError: true},
	}

	errors := ExtractErrors(messages, toolResults)
	if len(errors) != 0 {
		t.Errorf("expected 0 errors, got %d", len(errors))
	}
}

// --- TestExtractFiles ---

func TestExtractFiles(t *testing.T) {
	messages := []claude.Message{
		assistantMsg("m1", 1711000000000,
			toolUse("tu-1", "Read", map[string]any{"file_path": "/tmp/a.go"}),
			toolUse("tu-2", "Write", map[string]any{"file_path": "/tmp/b.go", "content": "x"}),
			toolUse("tu-3", "Edit", map[string]any{"file_path": "/tmp/b.go", "old_string": "a", "new_string": "b"}),
			toolUse("tu-4", "Read", map[string]any{"file_path": "/tmp/a.go"}), // duplicate
		),
	}

	result := ExtractFiles(messages)

	if len(result.Categories.Read) != 1 || result.Categories.Read[0] != "/tmp/a.go" {
		t.Errorf("unexpected read files: %v", result.Categories.Read)
	}
	if len(result.Categories.Written) != 1 || result.Categories.Written[0] != "/tmp/b.go" {
		t.Errorf("unexpected written files: %v", result.Categories.Written)
	}
	if len(result.Entries) != 4 {
		t.Errorf("expected 4 entries, got %d", len(result.Entries))
	}
	// Check timestamp conversion
	if result.Entries[0].Timestamp == "" {
		t.Error("expected non-empty timestamp")
	}
}

func TestExtractFiles_SkipsMissingFilePath(t *testing.T) {
	messages := []claude.Message{
		assistantMsg("m1", 1000,
			toolUse("tu-1", "Read", map[string]any{}),                         // no file_path
			toolUse("tu-2", "Read", nil),                                      // nil input
			toolUse("tu-3", "Bash", map[string]any{"file_path": "/tmp/x.go"}), // not a file tool
		),
	}

	result := ExtractFiles(messages)
	if len(result.Categories.Read) != 0 {
		t.Errorf("expected 0 read files, got %d", len(result.Categories.Read))
	}
	// Bash is not a read/write tool but has file_path — should still not categorize
	if len(result.Categories.Written) != 0 {
		t.Errorf("expected 0 written files, got %d", len(result.Categories.Written))
	}
}

func TestExtractFiles_SortedDedup(t *testing.T) {
	messages := []claude.Message{
		assistantMsg("m1", 1000,
			toolUse("tu-1", "Write", map[string]any{"file_path": "/z.go", "content": ""}),
			toolUse("tu-2", "Write", map[string]any{"file_path": "/a.go", "content": ""}),
			toolUse("tu-3", "Write", map[string]any{"file_path": "/z.go", "content": ""}),
		),
	}

	result := ExtractFiles(messages)
	if len(result.Categories.Written) != 2 {
		t.Fatalf("expected 2 unique written files, got %d", len(result.Categories.Written))
	}
	if result.Categories.Written[0] != "/a.go" || result.Categories.Written[1] != "/z.go" {
		t.Errorf("expected sorted order [/a.go, /z.go], got %v", result.Categories.Written)
	}
}

// --- TestExtractToolCounts ---

func TestExtractToolCounts(t *testing.T) {
	messages := []claude.Message{
		assistantMsg("m1", 1000,
			toolUse("tu-1", "Bash", map[string]any{"command": "ls"}),
			toolUse("tu-2", "Bash", map[string]any{"command": "pwd"}),
			toolUse("tu-3", "Read", map[string]any{"file_path": "/tmp/x"}),
		),
		assistantMsg("m2", 2000,
			toolUse("tu-4", "Bash", map[string]any{"command": "echo"}),
		),
	}

	counts := ExtractToolCounts(messages)

	if len(counts) != 2 {
		t.Fatalf("expected 2 tool counts, got %d", len(counts))
	}
	// Should be sorted descending
	if counts[0].Name != "Bash" || counts[0].Count != 3 {
		t.Errorf("expected Bash:3 first, got %s:%d", counts[0].Name, counts[0].Count)
	}
	if counts[1].Name != "Read" || counts[1].Count != 1 {
		t.Errorf("expected Read:1 second, got %s:%d", counts[1].Name, counts[1].Count)
	}
}

func TestExtractToolCounts_SkipsEmptyName(t *testing.T) {
	messages := []claude.Message{
		assistantMsg("m1", 1000,
			toolUse("tu-1", "", map[string]any{}),
		),
	}

	counts := ExtractToolCounts(messages)
	if len(counts) != 0 {
		t.Errorf("expected 0 counts, got %d", len(counts))
	}
}

// --- TestExtractSkills ---

func TestExtractSkills_FromToolUse(t *testing.T) {
	messages := []claude.Message{
		assistantMsg("m1", 1000,
			toolUse("tu-1", "Skill", map[string]any{"skill": "commit"}),
			toolUse("tu-2", "Skill", map[string]any{"skill": "commit"}),
			toolUse("tu-3", "Skill", map[string]any{"skill": "review-pr"}),
		),
	}

	skills := ExtractSkills(messages)

	if len(skills) != 2 {
		t.Fatalf("expected 2 skills, got %d", len(skills))
	}
	// commit has count 2, should be first
	if skills[0].Name != "commit" || skills[0].Count != 2 {
		t.Errorf("expected commit:2 first, got %s:%d", skills[0].Name, skills[0].Count)
	}
	if skills[1].Name != "review-pr" || skills[1].Count != 1 {
		t.Errorf("expected review-pr:1 second, got %s:%d", skills[1].Name, skills[1].Count)
	}
}

func TestExtractSkills_FromCommandNameTag(t *testing.T) {
	messages := []claude.Message{
		userMsg("m1", 1000,
			textBlock("<command-name>/commit</command-name>"),
		),
		userMsg("m2", 2000,
			textBlock("<command-name>review-pr</command-name>"),
		),
	}

	skills := ExtractSkills(messages)

	if len(skills) != 2 {
		t.Fatalf("expected 2 skills, got %d", len(skills))
	}
}

func TestExtractSkills_SkipsEmptySkillName(t *testing.T) {
	messages := []claude.Message{
		assistantMsg("m1", 1000,
			toolUse("tu-1", "Skill", map[string]any{"skill": ""}),
			toolUse("tu-2", "Skill", map[string]any{}),
			toolUse("tu-3", "Skill", nil),
		),
	}

	skills := ExtractSkills(messages)
	if len(skills) != 0 {
		t.Errorf("expected 0 skills, got %d", len(skills))
	}
}

// --- TestExtractWorktrees ---

func TestExtractWorktrees(t *testing.T) {
	messages := []claude.Message{
		assistantMsg("m1", 1000,
			toolUse("tu-1", "EnterWorktree", map[string]any{"name": "feature"}),
		),
	}
	toolResults := map[string]claude.ContentBlock{
		"tu-1": {Type: "tool_result", ToolUseID: "tu-1", Content: "Created worktree at /tmp/wt-1 on branch feature-branch"},
	}

	wts := ExtractWorktrees(messages, toolResults)

	if len(wts) != 1 {
		t.Fatalf("expected 1 worktree, got %d", len(wts))
	}
	if wts[0].Name != "feature" {
		t.Errorf("expected name 'feature', got %q", wts[0].Name)
	}
	if wts[0].Path != "/tmp/wt-1" {
		t.Errorf("expected path '/tmp/wt-1', got %q", wts[0].Path)
	}
	if wts[0].Branch != "feature-branch" {
		t.Errorf("expected branch 'feature-branch', got %q", wts[0].Branch)
	}
}

func TestExtractWorktrees_NilName(t *testing.T) {
	messages := []claude.Message{
		assistantMsg("m1", 1000,
			toolUse("tu-1", "EnterWorktree", map[string]any{}), // no "name" key
		),
	}
	toolResults := map[string]claude.ContentBlock{}

	wts := ExtractWorktrees(messages, toolResults)

	if len(wts) != 1 {
		t.Fatalf("expected 1 worktree, got %d", len(wts))
	}
	if wts[0].Name != "" {
		t.Errorf("expected empty name for nil input, got %q", wts[0].Name)
	}
	if wts[0].Path != "" || wts[0].Branch != "" {
		t.Errorf("expected empty path/branch when no result, got path=%q branch=%q", wts[0].Path, wts[0].Branch)
	}
}

// --- TestExtractSubagents ---

func TestExtractSubagents_FromToolUse(t *testing.T) {
	messages := []claude.Message{
		assistantMsg("m1", 1000,
			toolUse("tu-1", "Agent", map[string]any{"prompt": "search bugs", "description": "Bug search"}),
		),
	}
	toolResults := map[string]claude.ContentBlock{
		"tu-1": {Type: "tool_result", ToolUseID: "tu-1", Content: "Found bugs.\nagentId: abc123"},
	}

	subs := ExtractSubagents(messages, toolResults)

	if len(subs) != 1 {
		t.Fatalf("expected 1 subagent, got %d", len(subs))
	}
	if subs[0].AgentID != "abc123" {
		t.Errorf("expected agentId 'abc123', got %q", subs[0].AgentID)
	}
	if subs[0].Source != "tool_use" {
		t.Errorf("expected source 'tool_use', got %q", subs[0].Source)
	}
	if subs[0].Description != "Bug search" {
		t.Errorf("expected description 'Bug search', got %q", subs[0].Description)
	}
}

func TestExtractSubagents_AgentTypeFromToolUse(t *testing.T) {
	messages := []claude.Message{
		assistantMsg("m1", 1000,
			toolUse("tu-1", "Agent", map[string]any{"prompt": "explore code", "description": "Code explorer", "subagent_type": "Explore"}),
		),
	}
	toolResults := map[string]claude.ContentBlock{
		"tu-1": {Type: "tool_result", ToolUseID: "tu-1", Content: "Done.\nagentId: def456"},
	}

	subs := ExtractSubagents(messages, toolResults)

	if len(subs) != 1 {
		t.Fatalf("expected 1 subagent, got %d", len(subs))
	}
	if subs[0].AgentType != "Explore" {
		t.Errorf("expected agentType 'Explore', got %q", subs[0].AgentType)
	}
}

func TestExtractSubagents_FallbackID(t *testing.T) {
	messages := []claude.Message{
		assistantMsg("m1", 1000,
			toolUse("tu-1", "Agent", map[string]any{"prompt": "do stuff"}),
		),
	}
	toolResults := map[string]claude.ContentBlock{
		"tu-1": {Type: "tool_result", ToolUseID: "tu-1", Content: "Done, no agent id here"},
	}

	subs := ExtractSubagents(messages, toolResults)

	if len(subs) != 1 {
		t.Fatalf("expected 1 subagent, got %d", len(subs))
	}
	if subs[0].AgentID != "tool_use_tu-1" {
		t.Errorf("expected fallback agentId 'tool_use_tu-1', got %q", subs[0].AgentID)
	}
}

func TestExtractSubagents_FromProgress(t *testing.T) {
	messages := []claude.Message{
		progressMsg("p1", map[string]any{"type": "agent_progress", "agentId": "agent-1", "prompt": "search"}),
		progressMsg("p2", map[string]any{"type": "agent_progress", "agentId": "agent-1"}), // second turn
		progressMsg("p3", map[string]any{"type": "other_progress"}),                       // not agent_progress
	}
	toolResults := map[string]claude.ContentBlock{}

	subs := ExtractSubagents(messages, toolResults)

	if len(subs) != 1 {
		t.Fatalf("expected 1 subagent, got %d", len(subs))
	}
	if subs[0].AgentID != "agent-1" {
		t.Errorf("expected agentId 'agent-1', got %q", subs[0].AgentID)
	}
	if subs[0].TurnCount != 2 {
		t.Errorf("expected turnCount 2, got %d", subs[0].TurnCount)
	}
	if subs[0].Source != "agent_progress" {
		t.Errorf("expected source 'agent_progress', got %q", subs[0].Source)
	}
}

func TestExtractSubagents_DedupsPreferProgress(t *testing.T) {
	messages := []claude.Message{
		progressMsg("p1", map[string]any{"type": "agent_progress", "agentId": "abc123", "prompt": "from progress"}),
		assistantMsg("m1", 1000,
			toolUse("tu-1", "Agent", map[string]any{"prompt": "from tool_use"}),
		),
	}
	toolResults := map[string]claude.ContentBlock{
		"tu-1": {Type: "tool_result", ToolUseID: "tu-1", Content: "agentId: abc123"},
	}

	subs := ExtractSubagents(messages, toolResults)

	if len(subs) != 1 {
		t.Fatalf("expected 1 subagent (deduped), got %d", len(subs))
	}
	if subs[0].Source != "agent_progress" {
		t.Errorf("expected agent_progress to win dedup, got source=%q", subs[0].Source)
	}
}

// --- TestHelpers ---

func TestGetContentBlocks_NilMessage(t *testing.T) {
	msg := claude.Message{Type: claude.MessageTypeAssistant}
	blocks := GetContentBlocks(msg)
	if blocks != nil {
		t.Errorf("expected nil for message with no inner message, got %v", blocks)
	}
}

func TestGetContentBlocks_WithContent(t *testing.T) {
	msg := assistantMsg("m1", 1000, textBlock("hello"))
	blocks := GetContentBlocks(msg)
	if len(blocks) != 1 || blocks[0].Text != "hello" {
		t.Errorf("unexpected blocks: %v", blocks)
	}
}

func TestBuildToolResultMap(t *testing.T) {
	messages := []claude.Message{
		userMsg("m1", 1000,
			toolResult("tu-1", "result text", false),
			toolResult("tu-2", "error text", true),
		),
		assistantMsg("m2", 2000, // assistant messages should be ignored
			toolUse("tu-3", "Bash", map[string]any{"command": "ls"}),
		),
	}

	m := BuildToolResultMap(messages)

	if len(m) != 2 {
		t.Fatalf("expected 2 entries, got %d", len(m))
	}
	if m["tu-1"].Content != "result text" {
		t.Errorf("unexpected tu-1 content: %v", m["tu-1"].Content)
	}
	if !m["tu-2"].IsError {
		t.Error("expected tu-2 to be error")
	}
}

func TestBuildToolResultMap_SkipsEmptyToolUseID(t *testing.T) {
	messages := []claude.Message{
		userMsg("m1", 1000,
			toolResult("", "result text", false),
		),
	}

	m := BuildToolResultMap(messages)
	if len(m) != 0 {
		t.Errorf("expected 0 entries for empty tool_use_id, got %d", len(m))
	}
}

func TestResolveResultText(t *testing.T) {
	t.Run("nil content", func(t *testing.T) {
		block := claude.ContentBlock{Type: "tool_result"}
		if got := ResolveResultText(block); got != "" {
			t.Errorf("expected empty, got %q", got)
		}
	})

	t.Run("string content", func(t *testing.T) {
		block := claude.ContentBlock{Type: "tool_result", Content: "hello world"}
		if got := ResolveResultText(block); got != "hello world" {
			t.Errorf("expected 'hello world', got %q", got)
		}
	})

	t.Run("array content", func(t *testing.T) {
		block := claude.ContentBlock{
			Type: "tool_result",
			Content: []any{
				map[string]any{"type": "text", "text": "from array"},
			},
		}
		if got := ResolveResultText(block); got != "from array" {
			t.Errorf("expected 'from array', got %q", got)
		}
	})

	t.Run("array with no text entry", func(t *testing.T) {
		block := claude.ContentBlock{
			Type: "tool_result",
			Content: []any{
				map[string]any{"type": "image", "url": "http://example.com"},
			},
		}
		if got := ResolveResultText(block); got != "" {
			t.Errorf("expected empty, got %q", got)
		}
	})

	t.Run("non-string non-array content", func(t *testing.T) {
		block := claude.ContentBlock{Type: "tool_result", Content: 42}
		if got := ResolveResultText(block); got != "" {
			t.Errorf("expected empty for int content, got %q", got)
		}
	})
}

// --- TestClassifyMessageKind ---

func TestClassifyMessageKind(t *testing.T) {
	t.Run("skill expansion", func(t *testing.T) {
		msg := metaUserMsg("m1", 1000,
			textBlock("Base directory for this skill: /home/user/.claude/skills/commit\n\nCommit changes."),
		)
		if got := ClassifyMessageKind(msg); got != "skill-expansion" {
			t.Errorf("expected 'skill-expansion', got %q", got)
		}
	})

	t.Run("non-meta user", func(t *testing.T) {
		msg := userMsg("m1", 1000,
			textBlock("Base directory for this skill: /home/user/.claude/skills/commit"),
		)
		if got := ClassifyMessageKind(msg); got != "" {
			t.Errorf("expected empty for non-meta, got %q", got)
		}
	})

	t.Run("meta but not skill", func(t *testing.T) {
		msg := metaUserMsg("m1", 1000, textBlock("some other meta content"))
		if got := ClassifyMessageKind(msg); got != "" {
			t.Errorf("expected empty for non-skill meta, got %q", got)
		}
	})

	t.Run("assistant message", func(t *testing.T) {
		msg := assistantMsg("m1", 1000, textBlock("hello"))
		if got := ClassifyMessageKind(msg); got != "" {
			t.Errorf("expected empty for assistant, got %q", got)
		}
	})

	t.Run("channel message", func(t *testing.T) {
		msg := userMsg("m1", 1000,
			textBlock(`<channel source="agentrunner-channel" reply_to="thread-1" source_id="test-1" source_name="tester">
hello world
</channel>`),
		)
		if got := ClassifyMessageKind(msg); got != "channel-message" {
			t.Errorf("expected 'channel-message', got %q", got)
		}
	})

	t.Run("channel message on assistant ignored", func(t *testing.T) {
		msg := assistantMsg("m1", 1000,
			textBlock(`<channel source="x" reply_to="y" source_id="z" source_name="w">hi</channel>`),
		)
		if got := ClassifyMessageKind(msg); got != "" {
			t.Errorf("expected empty for assistant, got %q", got)
		}
	})
}

// --- TestExtractChannelInfo ---

func TestExtractChannelInfo(t *testing.T) {
	t.Run("extracts attributes and content", func(t *testing.T) {
		msg := userMsg("m1", 1000,
			textBlock(`<channel source="agentrunner-channel" reply_to="thread-1" source_id="test-1" source_name="tester">
hello world
</channel>`),
		)
		got := ExtractChannelInfo(msg)
		if got == nil {
			t.Fatal("expected channel info, got nil")
		}
		if got.Source != "agentrunner-channel" {
			t.Errorf("source: expected 'agentrunner-channel', got %q", got.Source)
		}
		if got.ReplyTo != "thread-1" {
			t.Errorf("replyTo: expected 'thread-1', got %q", got.ReplyTo)
		}
		if got.SourceID != "test-1" {
			t.Errorf("sourceID: expected 'test-1', got %q", got.SourceID)
		}
		if got.SourceName != "tester" {
			t.Errorf("sourceName: expected 'tester', got %q", got.SourceName)
		}
		if got.Content != "hello world" {
			t.Errorf("content: expected 'hello world', got %q", got.Content)
		}
	})

	t.Run("returns nil for non-channel", func(t *testing.T) {
		msg := userMsg("m1", 1000, textBlock("regular message"))
		if got := ExtractChannelInfo(msg); got != nil {
			t.Errorf("expected nil, got %+v", got)
		}
	})
}

// --- TestExtractSkillExpansionName ---

func TestExtractSkillExpansionName(t *testing.T) {
	t.Run("extracts skill name", func(t *testing.T) {
		msg := metaUserMsg("m1", 1000,
			textBlock("Base directory for this skill: /home/user/.claude/skills/commit\n\nDo commit."),
		)
		if got := ExtractSkillExpansionName(msg); got != "commit" {
			t.Errorf("expected 'commit', got %q", got)
		}
	})

	t.Run("no match", func(t *testing.T) {
		msg := userMsg("m1", 1000, textBlock("just a regular message"))
		if got := ExtractSkillExpansionName(msg); got != "" {
			t.Errorf("expected empty, got %q", got)
		}
	})

	t.Run("nil message", func(t *testing.T) {
		msg := claude.Message{Type: claude.MessageTypeUser}
		if got := ExtractSkillExpansionName(msg); got != "" {
			t.Errorf("expected empty for nil message, got %q", got)
		}
	})
}

// --- TestExtract (integration) ---

func TestExtract_EmptyMessages(t *testing.T) {
	ins := Extract(nil)

	// All slices should be non-nil (empty arrays for JSON marshaling)
	if ins.Tools == nil {
		t.Error("Tools should not be nil")
	}
	if ins.Commands == nil {
		t.Error("Commands should not be nil")
	}
	if ins.Errors == nil {
		t.Error("Errors should not be nil")
	}
	if ins.Files.Categories.Written == nil {
		t.Error("Files.Categories.Written should not be nil")
	}
	if ins.Files.Categories.Read == nil {
		t.Error("Files.Categories.Read should not be nil")
	}
	if ins.Files.Entries == nil {
		t.Error("Files.Entries should not be nil")
	}
	if ins.Worktrees == nil {
		t.Error("Worktrees should not be nil")
	}
	if ins.Skills == nil {
		t.Error("Skills should not be nil")
	}
	if ins.Subagents == nil {
		t.Error("Subagents should not be nil")
	}
}

func TestExtract_Integration(t *testing.T) {
	messages := []claude.Message{
		assistantMsg("m1", 1711000000000,
			toolUse("tu-1", "Bash", map[string]any{"command": "ls"}),
			toolUse("tu-2", "Read", map[string]any{"file_path": "/tmp/x.go"}),
			toolUse("tu-3", "Skill", map[string]any{"skill": "commit"}),
		),
		userMsg("m2", 1711000001000,
			toolResult("tu-1", "file1\nfile2", false),
			toolResult("tu-2", "package main", false),
			toolResult("tu-3", "committed", false),
		),
	}

	ins := Extract(messages)

	if len(ins.Commands) != 1 {
		t.Errorf("expected 1 command, got %d", len(ins.Commands))
	}
	if len(ins.Files.Categories.Read) != 1 {
		t.Errorf("expected 1 read file, got %d", len(ins.Files.Categories.Read))
	}
	if len(ins.Skills) != 1 {
		t.Errorf("expected 1 skill, got %d", len(ins.Skills))
	}
	if len(ins.Tools) != 3 {
		t.Errorf("expected 3 tool counts, got %d", len(ins.Tools))
	}
}

// --- TestMsToISO ---

func TestMsToISO(t *testing.T) {
	t.Run("zero returns empty", func(t *testing.T) {
		if got := msToISO(0); got != "" {
			t.Errorf("expected empty, got %q", got)
		}
	})

	t.Run("converts correctly", func(t *testing.T) {
		// 1711000000000ms = 2024-03-21T05:46:40Z
		got := msToISO(1711000000000)
		if got != "2024-03-21T05:46:40Z" {
			t.Errorf("expected '2024-03-21T05:46:40Z', got %q", got)
		}
	})
}

// --- TestSortedKeys ---

func TestSortedKeys(t *testing.T) {
	t.Run("empty map", func(t *testing.T) {
		got := sortedKeys(map[string]bool{})
		if len(got) != 0 {
			t.Errorf("expected empty, got %v", got)
		}
	})

	t.Run("returns sorted", func(t *testing.T) {
		got := sortedKeys(map[string]bool{"z": true, "a": true, "m": true})
		if len(got) != 3 || got[0] != "a" || got[1] != "m" || got[2] != "z" {
			t.Errorf("expected [a m z], got %v", got)
		}
	})
}

// --- TestMessageText ---

func TestMessageText(t *testing.T) {
	t.Run("nil message", func(t *testing.T) {
		msg := claude.Message{}
		if got := messageText(msg); got != "" {
			t.Errorf("expected empty, got %q", got)
		}
	})

	t.Run("concatenates text blocks", func(t *testing.T) {
		msg := userMsg("m1", 1000, textBlock("hello"), textBlock("world"))
		got := messageText(msg)
		if got != "hello\nworld" {
			t.Errorf("expected 'hello\\nworld', got %q", got)
		}
	})

	t.Run("ignores non-text blocks", func(t *testing.T) {
		msg := assistantMsg("m1", 1000,
			textBlock("hello"),
			toolUse("tu-1", "Bash", map[string]any{"command": "ls"}),
		)
		got := messageText(msg)
		if got != "hello" {
			t.Errorf("expected 'hello', got %q", got)
		}
	})
}
