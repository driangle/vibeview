# Extract Core Logic into Standalone Go Library

**Date:** 2026-04-18
**Scope:** Extract session parsing, discovery, analysis, and search into a reusable Go module

---

## Overview

VibeView's core logic — parsing Claude Code JSONL files, discovering sessions, extracting insights, and searching — is currently locked behind Go's `internal/` convention. This spec defines how to extract that logic into a standalone, importable Go library so other tools can consume it.

**Known consumer:** `doer` CLI.

---

## Goals

- Expose a clean, versioned Go API for working with Claude Code session data
- Zero breaking changes to vibeview itself — it becomes a consumer of its own library
- Minimal public surface area — export what's needed, keep implementation details private

## Non-Goals

- HTTP server, SSE streaming, or web UI concerns — these stay in vibeview
- Changing the data format or on-disk layout of Claude Code sessions
- Supporting non-Claude-Code session formats (Codex, Gemini) in this iteration

---

## Architecture

### Module Layout

The library lives as a new Go module alongside the existing CLI:

```
apps/
├── cli/                          # existing vibeview CLI + web server
│   ├── cmd/vibeview/
│   ├── internal/                 # app-specific code (server, watcher, spa, settings, projects)
│   │   ├── server/
│   │   ├── watcher/
│   │   ├── spa/
│   │   ├── settings/
│   │   └── projects/
│   └── go.mod                    # github.com/driangle/vibeview — imports the library
└── lib/                          # NEW: standalone library
    ├── go.mod                    # github.com/driangle/vibeview/lib
    ├── claude/                   # JSONL parsing & types
    ├── session/                  # discovery & indexing
    ├── insights/                 # session analysis
    ├── search/                   # full-text search
    ├── redact/                   # secret masking
    ├── pathutil/                 # path utilities
    └── logutil/                  # structured logging
```

The CLI's `go.mod` adds a `require` + `replace` directive to consume the library locally during development:

```go
require github.com/driangle/vibeview/lib v0.0.0

replace github.com/driangle/vibeview/lib => ../lib
```

### Dependency Direction

```
doer CLI ──────┐
               ▼
vibeview CLI ──► vibeview/lib
               ▲
               │
         (future consumers)
```

The library has no knowledge of its consumers. The CLI's `internal/` packages (`server`, `watcher`, etc.) import the library and add app-specific orchestration.

---

## Package API

### `claude` — JSONL Parsing & Types

The foundational package. Parses Claude Code's on-disk JSONL format into structured Go types.

**Types:**

```go
type Timestamp int64          // epoch milliseconds

type HistoryEntry struct {
    SessionID string
    Project   string
    Display   string
    Timestamp Timestamp
}

type MessageType string

const (
    MessageTypeUser                MessageType = "user"
    MessageTypeAssistant           MessageType = "assistant"
    MessageTypeProgress            MessageType = "progress"
    MessageTypeSystem              MessageType = "system"
    MessageTypeFileHistorySnapshot MessageType = "file-history-snapshot"
    MessageTypeCustomTitle         MessageType = "custom_title"
    MessageTypeResult              MessageType = "result"
    MessageTypeQueueOperation      MessageType = "queue_operation"
    MessageTypeLastPrompt          MessageType = "last_prompt"
    MessageTypePermissionMode      MessageType = "permission_mode"
    MessageTypeAttachment          MessageType = "attachment"
)

type Message struct {
    Type           MessageType
    UUID           string
    ParentUUID     string
    SessionID      string
    Timestamp      Timestamp
    Cwd            string
    GitBranch      string
    IsSidechain    bool
    IsMeta         bool
    Version        string
    Message        *APIMessage
    Content        string
    Data           map[string]any
    ToolUseID      string
    Snapshot       map[string]any
    CustomTitle    string
    PermissionMode string
    Attachment     map[string]any
    ToolUseResult  *ToolUseResult
    TotalCostUSD   float64
}

type APIMessage struct {
    Role    string
    Model   string
    Content []ContentBlock
    Usage   *Usage
}

type ContentBlock struct {
    Type      string         // "text", "thinking", "tool_use", "tool_result"
    Text      string
    Thinking  string
    Signature string
    ID        string         // tool_use id
    Name      string         // tool name
    Input     map[string]any
    ToolUseID string         // for tool_result
    Content   any            // tool result content
    IsError   bool
}

type Usage struct {
    InputTokens              int
    OutputTokens             int
    CacheCreationInputTokens int
    CacheReadInputTokens     int
    CostUSD                  float64
}

type ToolUseResult struct {
    DurationMs int
    Filenames  []string
    NumFiles   int
    Truncated  bool
}

type ParseResult struct {
    SkippedLines     int
    MalformedSamples []string
}
```

**Functions:**

```go
func ParseHistoryLine(line []byte) (HistoryEntry, error)
func ParseMessageLine(line []byte) (Message, error)
func ParseHistoryFile(r io.Reader) ([]HistoryEntry, ParseResult, error)
func ParseSessionFile(r io.Reader) ([]Message, ParseResult, error)

func EncodeProjectPath(path string) string
func DecodeProjectPath(encoded string) string
```

**Dependencies:** stdlib only (+ `logutil`).

---

### `session` — Discovery & Indexing

Discovers sessions from Claude Code's data directories and provides a thread-safe index.

**Types:**

```go
type UsageTotals struct {
    InputTokens              int
    OutputTokens             int
    CacheCreationInputTokens int
    CacheReadInputTokens     int
    CostUSD                  float64
}

type SessionMeta struct {
    SessionID     string
    Project       string
    CustomTitle   string
    Timestamp     int64          // epoch millis
    MessageCount  int
    Model         string
    Slug          string
    Usage         UsageTotals
    ActivityState string
    DurationMs    int64
    FilePath      string         // absolute path, empty for Claude dir sessions
}

type ProcessChecker interface {
    IsProcessAlive(sessionID string) bool
}

type Index struct { /* thread-safe via RWMutex */ }
```

**Functions:**

```go
// Discovery
func Discover(claudeDir string, dirs []string) (*Index, error)
func LoadFromPaths(paths []string) (*Index, error)
func ScanProjectDirs(claudeDir string, dirSet map[string]struct{}) []SessionMeta

// Index operations
func (idx *Index) GetSessions() []SessionMeta
func (idx *Index) FindSession(id string) *SessionMeta
func (idx *Index) FindSessionByPrefix(prefix string) (*SessionMeta, error)
func (idx *Index) FilterByProject(query string) []SessionMeta
func (idx *Index) AddSessionMeta(meta SessionMeta) bool
func (idx *Index) AddSession(claudeDir string, entry claude.HistoryEntry)
func (idx *Index) SetProcessChecker(c ProcessChecker)
func (idx *Index) SetCustomTitle(id, title string)
func (idx *Index) SetActivityState(id, state string)

// Enrichment
func (idx *Index) Enrich(claudeDir string)
func (idx *Index) EnrichN(claudeDir string, n int)
func (idx *Index) EnrichSession(claudeDir string, sessionID string) bool

// Path resolution
func SessionFilePath(claudeDir, project, sessionID string) (string, error)
func ResolveFilePath(claudeDir string, meta SessionMeta) (string, error)

// Activity state
const (
    ActivityWorking            = "working"
    ActivityWaitingForApproval = "waiting_for_approval"
    ActivityWaitingForInput    = "waiting_for_input"
    ActivityIdle               = "idle"
)
func DeriveActivityState(messages []claude.Message) string
func DeriveActivityStateFromMessage(msg claude.Message) string
```

**Dependencies:** `claude`, `pathutil`, `logutil`.

---

### `insights` — Session Analysis

Extracts structured insights from a session's messages: tool usage, bash commands, errors, files touched, worktrees, skills, and subagents.

**Types:**

```go
type SessionInsights struct {
    Tools     []ToolCount
    Commands  []BashCommand
    Errors    []ErrorEntry
    Files     FilesResult
    Worktrees []WorktreeEntry
    Skills    []SkillEntry
    Subagents []SubagentEntry
}

type ToolCount struct {
    Name  string
    Count int
}

type BashCommand struct {
    Command     string
    ToolUseID   string
    MessageUUID string
}

type ErrorEntry struct {
    ToolName    string
    Snippet     string
    MessageUUID string
}

type FilesResult struct {
    Categories FilesByCategory
    Entries    []FileEntry
}

type FilesByCategory struct {
    Written []string
    Read    []string
}

type FileEntry struct {
    ToolUseID   string
    ToolName    string
    FilePath    string
    Input       map[string]any
    Timestamp   string
    MessageUUID string
}

type WorktreeEntry struct {
    Name, Path, Branch, MessageUUID string
}

type SkillEntry struct {
    Name        string
    Count       int
    MessageUUID string
}

type SubagentEntry struct {
    Source, AgentID, AgentType     string
    Prompt, Description           string
    FirstMessageUUID, ToolUseID   string
    ResultText                    string
    TurnCount                     int
}
```

**Functions:**

```go
func Extract(messages []claude.Message) SessionInsights

// Per-category extractors (also public for selective use)
func BuildToolResultMap(messages []claude.Message) map[string][]claude.ContentBlock
func ExtractToolCounts(messages []claude.Message) []ToolCount
func ExtractBashCommands(messages []claude.Message) []BashCommand
func ExtractErrors(messages []claude.Message, toolResults map[string][]claude.ContentBlock) []ErrorEntry
func ExtractFiles(messages []claude.Message) FilesResult
func ExtractWorktrees(messages []claude.Message, toolResults map[string][]claude.ContentBlock) []WorktreeEntry
func ExtractSkills(messages []claude.Message) []SkillEntry
func ExtractSubagents(messages []claude.Message, toolResults map[string][]claude.ContentBlock) []SubagentEntry
```

**Dependencies:** `claude`, `redact`.

---

### `search` — Full-Text Search

Searches session JSONL files for matching messages.

```go
type Result struct {
    Meta    session.SessionMeta
    Snippet string  // redacted, ~120 chars with context
}

type Options struct {
    Query     string
    Limit     int
    ClaudeDir string
    Dirs      []string
}

func Search(ctx context.Context, idx *session.Index, opts Options) []Result
```

**Dependencies:** `session`, `claude`, `redact`.

---

### `redact` — Secret Masking

Strips sensitive values from text before display or export.

```go
func RedactSecrets(text string) string
func MaskHomePath(path string) string
```

Detects: CLI flags (`--password`, `--token`), auth headers, env vars, bearer tokens, connection strings, SSH private keys.

**Dependencies:** stdlib only.

---

### `pathutil` — Path Utilities

```go
func ValidateClaudeDir(dir string) error
```

**Dependencies:** stdlib only.

---

### `logutil` — Logging

```go
func SetVerbose(v bool)
func Verbose(format string, args ...any)
```

**Dependencies:** stdlib only.

---

## Migration Plan

### Phase 1: Create the library module

1. Create `apps/lib/` with its own `go.mod` (`github.com/driangle/vibeview/lib`)
2. Copy the 7 packages from `apps/cli/internal/` into `apps/lib/`
3. Remove the `internal/` path segment — packages become directly importable
4. Adjust inter-package imports to use the new module path
5. Verify the library compiles: `cd apps/lib && go build ./...`
6. Run existing tests in the new location: `cd apps/lib && go test ./...`

### Phase 2: Rewire vibeview CLI

1. Add `require` + `replace` directives in `apps/cli/go.mod`
2. Update all imports in `apps/cli/internal/` and `apps/cli/cmd/` from `github.com/driangle/vibeview/internal/...` to `github.com/driangle/vibeview/lib/...`
3. Delete the migrated packages from `apps/cli/internal/`
4. Verify: `cd apps/cli && go build ./... && go test ./...`

### Phase 3: Publish

1. Tag the library module: `git tag apps/lib/v0.1.0`
2. Consumers install with: `go get github.com/driangle/vibeview/lib@v0.1.0`

---

## Usage Example (doer CLI)

```go
package main

import (
    "context"
    "fmt"
    "os"
    "path/filepath"

    "github.com/driangle/vibeview/lib/claude"
    "github.com/driangle/vibeview/lib/session"
    "github.com/driangle/vibeview/lib/insights"
    "github.com/driangle/vibeview/lib/search"
)

func main() {
    home, _ := os.UserHomeDir()
    claudeDir := filepath.Join(home, ".claude")

    // Discover all sessions
    idx, _ := session.Discover(claudeDir, nil)
    idx.Enrich(claudeDir)

    // Search across sessions
    results := search.Search(context.Background(), idx, search.Options{
        Query:     "database migration",
        Limit:     5,
        ClaudeDir: claudeDir,
    })
    for _, r := range results {
        fmt.Printf("[%s] %s\n", r.Meta.SessionID[:8], r.Snippet)
    }

    // Load and analyze a specific session
    meta := idx.GetSessions()[0]
    path, _ := session.ResolveFilePath(claudeDir, meta)
    f, _ := os.Open(path)
    messages, _, _ := claude.ParseSessionFile(f)
    f.Close()

    si := insights.Extract(messages)
    fmt.Printf("Tools used: %d, Files written: %d\n",
        len(si.Tools), len(si.Files.Categories.Written))
}
```

---

## Open Questions

1. **Module path:** `github.com/driangle/vibeview/lib` vs a top-level `github.com/driangle/ccview` (or similar neutral name)?
2. **`pidcheck` package:** Platform-specific process detection — include in library or leave as app concern? Consumers would need to provide their own `ProcessChecker` implementation if excluded.
3. **Redact policy:** Should redaction be opt-in at the library level? Some consumers (like `doer`) may not need it or may want different rules.
