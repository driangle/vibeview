package insights

// SessionInsights holds all extracted data from a session's messages.
type SessionInsights struct {
	Tools     []ToolCount     `json:"tools"`
	Commands  []BashCommand   `json:"commands"`
	Errors    []ErrorEntry    `json:"errors"`
	Files     FilesResult     `json:"files"`
	Worktrees []WorktreeEntry `json:"worktrees"`
	Skills    []SkillEntry    `json:"skills"`
	Subagents []SubagentEntry `json:"subagents"`
}

type ToolCount struct {
	Name  string `json:"name"`
	Count int    `json:"count"`
}

type BashCommand struct {
	Command     string `json:"command"`
	ToolUseID   string `json:"toolUseId"`
	MessageUUID string `json:"messageUuid"`
}

type ErrorEntry struct {
	ToolName    string `json:"toolName"`
	Snippet     string `json:"snippet"`
	MessageUUID string `json:"messageUuid"`
}

type FilesResult struct {
	Categories FilesByCategory `json:"categories"`
	Entries    []FileEntry     `json:"entries"`
}

type FilesByCategory struct {
	Written []string `json:"written"`
	Read    []string `json:"read"`
}

type FileEntry struct {
	ToolUseID   string         `json:"toolUseId"`
	ToolName    string         `json:"toolName"`
	FilePath    string         `json:"filePath"`
	Input       map[string]any `json:"input"`
	Timestamp   string         `json:"timestamp"`
	MessageUUID string         `json:"messageUuid"`
}

type WorktreeEntry struct {
	Name        string `json:"name"`
	Path        string `json:"path"`
	Branch      string `json:"branch"`
	MessageUUID string `json:"messageUuid"`
}

type SkillEntry struct {
	Name        string `json:"name"`
	Count       int    `json:"count"`
	MessageUUID string `json:"messageUuid"`
}

type SubagentEntry struct {
	Source           string `json:"source"`
	AgentID          string `json:"agentId"`
	Prompt           string `json:"prompt"`
	Description      string `json:"description"`
	FirstMessageUUID string `json:"firstMessageUuid"`
	ToolUseID        string `json:"toolUseId,omitempty"`
	ResultText       string `json:"resultText,omitempty"`
	TurnCount        int    `json:"turnCount,omitempty"`
}
