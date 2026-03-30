package main

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"os/signal"
	"path/filepath"
	"runtime"
	"strings"
	"syscall"
	"time"

	"github.com/driangle/vibeview/internal/claude"
	"github.com/driangle/vibeview/internal/insights"
	"github.com/driangle/vibeview/internal/logutil"
	"github.com/driangle/vibeview/internal/pathutil"
	"github.com/driangle/vibeview/internal/redact"
	"github.com/driangle/vibeview/internal/search"
	"github.com/driangle/vibeview/internal/server"
	"github.com/driangle/vibeview/internal/session"
	"github.com/spf13/cobra"
	"gopkg.in/yaml.v3"
)

// Version information (set via build flags).
var (
	Version   = "dev"
	GitCommit = "unknown"
	BuildDate = "unknown"
	GitDirty  = ""
)

// fullVersion returns the display version string.
// Examples: "0.1.0", "0.1.0-abc1234", "0.1.0-abc1234*"
func fullVersion() string {
	v := Version
	if GitCommit != "unknown" && GitCommit != "" {
		short := GitCommit
		if len(short) > 7 {
			short = short[:7]
		}
		v += "-" + short
	}
	if GitDirty == "true" {
		v += "*"
	}
	return v
}

func main() {
	home, err := os.UserHomeDir()
	if err != nil {
		fmt.Fprintf(os.Stderr, "error: %v\n", err)
		os.Exit(1)
	}
	defaultClaudeDir := filepath.Join(home, ".claude")

	// Persistent flags shared by all commands.
	var claudeDir string
	var logLevel string

	root := &cobra.Command{
		Use:   "vibeview",
		Short: "Session viewer and diagnostic tool for Claude Code",
		Long: `vibeview provides a web interface for browsing Claude Code sessions,
plus CLI tools for inspecting and searching session data.

Running vibeview without a subcommand starts the web server.`,
	}

	// Add --version without -v shorthand so inspect can use -v for --verbose.
	var showVersion bool
	root.Flags().BoolVar(&showVersion, "version", false, "version for vibeview")
	root.RunE = func(cmd *cobra.Command, args []string) error {
		if showVersion {
			fmt.Printf("vibeview version %s\n  Git commit: %s\n  Built:      %s\n", Version, GitCommit, BuildDate)
			return nil
		}
		return cmd.Help()
	}

	root.PersistentFlags().StringVar(&claudeDir, "claude-dir", defaultClaudeDir, "path to claude data directory")
	root.PersistentFlags().StringVar(&logLevel, "log-level", "warn", "log level: debug, warn, error")

	root.AddCommand(serveCmd(home, &claudeDir, &logLevel))
	root.AddCommand(inspectCmd(&claudeDir, &logLevel))
	root.AddCommand(searchCmd(&claudeDir, &logLevel))
	root.AddCommand(statsCmd(&claudeDir, &logLevel))

	// Make "serve" the default when no subcommand is given.
	// Prepend "serve" for: bare invocation, positional file args, or
	// serve-specific flags (--port, --open, --dirs).
	// Do NOT prepend for --help, --version, or global flags alone.
	if len(os.Args) <= 1 {
		os.Args = append(os.Args, "serve")
	} else {
		knownCmds := map[string]bool{
			"serve": true, "inspect": true, "search": true, "stats": true,
			"help": true, "completion": true,
		}
		helpFlags := map[string]bool{
			"--help": true, "-h": true, "--version": true,
		}
		first := os.Args[1]
		if !knownCmds[first] && !helpFlags[first] && !strings.HasPrefix(first, "-") {
			// Positional arg (file path) — treat as serve.
			os.Args = append([]string{os.Args[0], "serve"}, os.Args[1:]...)
		}
	}

	if err := root.Execute(); err != nil {
		os.Exit(1)
	}
}

// --- serve ---

func serveCmd(home string, claudeDir *string, logLevel *string) *cobra.Command {
	var port int
	var open bool
	var dirsFlag string

	cmd := &cobra.Command{
		Use:   "serve [files...]",
		Short: "Start the web interface (default)",
		Long: `Start the vibeview web server. This is the default command when no
subcommand is specified.

Positional arguments are treated as standalone JSONL files or directories.

Examples:
  vibeview
  vibeview --port 8080
  vibeview serve --open
  vibeview session.jsonl
  vibeview --dirs myproject`,
		Run: func(cmd *cobra.Command, args []string) {
			logutil.SetLevel(logutil.ParseLevel(*logLevel))

			var dirs []string
			if dirsFlag != "" {
				for _, d := range strings.Split(dirsFlag, ",") {
					if trimmed := strings.TrimSpace(d); trimmed != "" {
						dirs = append(dirs, trimmed)
					}
				}
			}

			configDir := filepath.Join(home, ".config", "vibeview")
			settingsPath := filepath.Join(configDir, "settings.json")
			projectsPath := filepath.Join(configDir, "projects.json")

			cfg := server.Config{
				ClaudeDir:    *claudeDir,
				Dirs:         dirs,
				SettingsPath: settingsPath,
				ProjectsPath: projectsPath,
			}

			if len(args) > 0 {
				idx, err := session.LoadFromPaths(args)
				if err != nil {
					fmt.Fprintf(os.Stderr, "error: %v\n", err)
					os.Exit(1)
				}
				cfg.Index = idx
				cfg.Standalone = true
				cfg.Paths = args
				fmt.Printf("vibeview %s (standalone)\n", fullVersion())
				fmt.Printf("  port:   %d\n", port)
				fmt.Printf("  files:  %v\n", args)
			} else {
				fmt.Printf("vibeview %s\n", fullVersion())
				fmt.Printf("  port:      %d\n", port)
				fmt.Printf("  claude-dir: %s\n", *claudeDir)
				fmt.Printf("  open:      %t\n", open)
				if len(dirs) > 0 {
					fmt.Printf("  dirs:      %s\n", strings.Join(dirs, ", "))
				}
			}

			srv, err := server.New(cfg)
			if err != nil {
				fmt.Fprintf(os.Stderr, "error: %v\n", err)
				os.Exit(1)
			}

			url := fmt.Sprintf("http://localhost:%d", port)
			fmt.Printf("listening on %s\n", url)

			if open {
				go openBrowser(url)
			}

			sigCh := make(chan os.Signal, 1)
			signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)

			go func() {
				<-sigCh
				ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
				defer cancel()
				_ = srv.Shutdown(ctx)
			}()

			if err := srv.ListenAndServe(port); err != nil && err.Error() != "http: Server closed" {
				fmt.Fprintf(os.Stderr, "error: %v\n", err)
				os.Exit(1)
			}
		},
	}

	cmd.Flags().IntVar(&port, "port", 4880, "port to listen on")
	cmd.Flags().BoolVar(&open, "open", false, "open browser on startup")
	cmd.Flags().StringVar(&dirsFlag, "dirs", "", "comma-separated project directory names to filter")

	return cmd
}

// --- inspect ---

func inspectCmd(claudeDir *string, logLevel *string) *cobra.Command {
	var jsonOutput bool
	var yamlOutput bool
	var verbose bool

	cmd := &cobra.Command{
		Use:   "inspect <session-file | directory | session-id>",
		Short: "Inspect a session file, directory, or session ID",
		Long: `Inspect Claude Code session data and report metadata,
path resolution, token usage, and insights.

Input can be:
  - A .jsonl session file path
  - A directory containing .jsonl files
  - A session ID (looked up in ~/.claude/history.jsonl)

Examples:
  vibeview inspect 877fff1e-80c9-4d20-a600-f278eb2c7bdc
  vibeview inspect /path/to/session.jsonl
  vibeview inspect --json 877fff1e-80c9-4d20-a600-f278eb2c7bdc
  vibeview inspect --yaml 877fff1e-80c9-4d20-a600-f278eb2c7bdc
  vibeview inspect -v 877fff1e-80c9-4d20-a600-f278eb2c7bdc`,
		Args: cobra.ExactArgs(1),
		Run: func(cmd *cobra.Command, args []string) {
			logutil.SetLevel(logutil.LevelDebug)

			target := args[0]
			var report inspectReport

			info, statErr := os.Stat(target)
			switch {
			case statErr == nil && info.IsDir():
				report.Directory = buildDirectoryReport(target)
			case statErr == nil && !info.IsDir():
				r := buildFileReport(target)
				report.File = &r
			default:
				report.Lookup = buildLookupReport(*claudeDir, target)
			}

			switch {
			case jsonOutput:
				outputAny(unwrapReport(report), true)
			case yamlOutput:
				outputAny(unwrapReport(report), false)
			default:
				renderStyled(os.Stdout, report, verbose)
			}
		},
	}

	cmd.Flags().BoolVar(&jsonOutput, "json", false, "output as JSON")
	cmd.Flags().BoolVar(&yamlOutput, "yaml", false, "output as YAML")
	cmd.Flags().BoolVarP(&verbose, "verbose", "v", false, "include diagnostic sections")

	return cmd
}

// --- search ---

func searchCmd(claudeDir *string, logLevel *string) *cobra.Command {
	var jsonOutput bool
	var limit int
	var dirsFlag string

	cmd := &cobra.Command{
		Use:   "search <query>",
		Short: "Search session content",
		Long: `Full-text search across all Claude Code session JSONL files.
Uses the same search algorithm as the vibeview web interface.

Examples:
  vibeview search "database migration"
  vibeview search --limit 5 "auth middleware"
  vibeview search --dirs myproject "TODO"
  vibeview search --json "error handling"`,
		Args: cobra.ExactArgs(1),
		Run: func(cmd *cobra.Command, args []string) {
			logutil.SetLevel(logutil.LevelWarn)

			var dirs []string
			if dirsFlag != "" {
				for _, d := range strings.Split(dirsFlag, ",") {
					if trimmed := strings.TrimSpace(d); trimmed != "" {
						dirs = append(dirs, trimmed)
					}
				}
			}

			idx, err := discoverAndEnrich(*claudeDir, dirs)
			if err != nil {
				fmt.Fprintf(os.Stderr, "error discovering sessions: %v\n", err)
				os.Exit(1)
			}

			report := doSearch(idx, *claudeDir, args[0], limit)
			outputAny(report, jsonOutput)
		},
	}

	cmd.Flags().BoolVar(&jsonOutput, "json", false, "output as JSON instead of YAML")
	cmd.Flags().IntVar(&limit, "limit", 20, "maximum number of results")
	cmd.Flags().StringVar(&dirsFlag, "dirs", "", "comma-separated project directory names to filter")

	return cmd
}

// --- Report types ---

type inspectReport struct {
	File      *fileReport      `json:"file,omitempty" yaml:"file,omitempty"`
	Directory *directoryReport `json:"directory,omitempty" yaml:"directory,omitempty"`
	Lookup    *lookupReport    `json:"lookup,omitempty" yaml:"lookup,omitempty"`
}

type searchReport struct {
	Query   string              `json:"query" yaml:"query"`
	Total   int                 `json:"total" yaml:"total"`
	Results []searchResultEntry `json:"results" yaml:"results"`
}

type searchResultEntry struct {
	SessionID string `json:"session_id" yaml:"session_id"`
	Project   string `json:"project" yaml:"project"`
	Slug      string `json:"slug" yaml:"slug"`
	Model     string `json:"model" yaml:"model"`
	Timestamp string `json:"timestamp" yaml:"timestamp"`
	Snippet   string `json:"snippet" yaml:"snippet"`
}

type directoryReport struct {
	Path     string       `json:"path" yaml:"path"`
	Sessions []fileReport `json:"sessions" yaml:"sessions"`
}

type fileReport struct {
	Path     string          `json:"path" yaml:"path"`
	Size     int64           `json:"size_bytes" yaml:"size_bytes"`
	Modified string          `json:"modified" yaml:"modified"`
	Parse    *parseReport    `json:"parse,omitempty" yaml:"parse,omitempty"`
	Messages *messageReport  `json:"messages" yaml:"messages"`
	Usage    *usageReport    `json:"usage" yaml:"usage"`
	Insights *insightsReport `json:"insights" yaml:"insights"`
}

type lookupReport struct {
	SessionID   string            `json:"session_id" yaml:"session_id"`
	Valid       bool              `json:"valid" yaml:"valid"`
	HistoryHits int               `json:"history_hits" yaml:"history_hits"`
	Project     string            `json:"project" yaml:"project"`
	Timestamp   string            `json:"timestamp" yaml:"timestamp"`
	Resolution  *resolutionReport `json:"resolution" yaml:"resolution"`
	Enrichment  *enrichmentReport `json:"enrichment,omitempty" yaml:"enrichment,omitempty"`
	Messages    *messageReport    `json:"messages,omitempty" yaml:"messages,omitempty"`
	Usage       *usageReport      `json:"usage,omitempty" yaml:"usage,omitempty"`
	Insights    *insightsReport   `json:"insights,omitempty" yaml:"insights,omitempty"`
	Problems    []string          `json:"problems,omitempty" yaml:"problems,omitempty"`
}

type resolutionReport struct {
	EncodedPath string   `json:"encoded_path" yaml:"encoded_path"`
	ExpectedDir string   `json:"expected_dir" yaml:"expected_dir"`
	DirExists   bool     `json:"dir_exists" yaml:"dir_exists"`
	FileExists  bool     `json:"file_exists" yaml:"file_exists"`
	FilePath    string   `json:"file_path" yaml:"file_path"`
	Candidates  []string `json:"candidates,omitempty" yaml:"candidates,omitempty"`
}

type enrichmentReport struct {
	Success  bool   `json:"success" yaml:"success"`
	Messages int    `json:"messages" yaml:"messages"`
	Model    string `json:"model" yaml:"model"`
	Slug     string `json:"slug" yaml:"slug"`
	Activity string `json:"activity" yaml:"activity"`
}

type parseReport struct {
	SkippedLines int      `json:"skipped_lines" yaml:"skipped_lines"`
	Samples      []string `json:"samples,omitempty" yaml:"samples,omitempty"`
}

type messageReport struct {
	Total    int            `json:"total" yaml:"total"`
	ByType   map[string]int `json:"by_type" yaml:"by_type"`
	First    string         `json:"first,omitempty" yaml:"first,omitempty"`
	Last     string         `json:"last,omitempty" yaml:"last,omitempty"`
	Duration string         `json:"duration,omitempty" yaml:"duration,omitempty"`
	Model    string         `json:"model,omitempty" yaml:"model,omitempty"`
}

type usageReport struct {
	InputTokens         int     `json:"input_tokens" yaml:"input_tokens"`
	OutputTokens        int     `json:"output_tokens" yaml:"output_tokens"`
	CacheCreationTokens int     `json:"cache_creation_tokens" yaml:"cache_creation_tokens"`
	CacheReadTokens     int     `json:"cache_read_tokens" yaml:"cache_read_tokens"`
	TotalTokens         int     `json:"total_tokens" yaml:"total_tokens"`
	Cost                float64 `json:"cost_usd" yaml:"cost_usd"`
}

type insightsReport struct {
	Tools        []toolEntry      `json:"tools,omitempty" yaml:"tools,omitempty"`
	Errors       []errorDetail    `json:"errors,omitempty" yaml:"errors,omitempty"`
	FilesWritten []string         `json:"files_written" yaml:"files_written"`
	FilesRead    int              `json:"files_read" yaml:"files_read"`
	BashCommands int              `json:"bash_commands" yaml:"bash_commands"`
	Subagents    []subagentDetail `json:"subagents,omitempty" yaml:"subagents,omitempty"`
	Skills       []toolEntry      `json:"skills,omitempty" yaml:"skills,omitempty"`
}

type toolEntry struct {
	Name  string `json:"name" yaml:"name"`
	Count int    `json:"count" yaml:"count"`
}

type errorDetail struct {
	ToolName string `json:"tool_name" yaml:"tool_name"`
	Snippet  string `json:"snippet" yaml:"snippet"`
}

type subagentDetail struct {
	Description string `json:"description" yaml:"description"`
	TurnCount   int    `json:"turn_count,omitempty" yaml:"turn_count,omitempty"`
}

// --- Builders ---

func buildFileReport(path string) fileReport {
	abs, _ := filepath.Abs(path)
	info, _ := os.Stat(abs)

	r := fileReport{
		Path:     abs,
		Size:     info.Size(),
		Modified: info.ModTime().Format(time.RFC3339),
	}

	f, err := os.Open(abs)
	if err != nil {
		return r
	}
	defer f.Close()

	messages, parseResult, err := claude.ParseSessionFile(f)
	if err != nil {
		return r
	}

	if parseResult.SkippedLines > 0 {
		r.Parse = &parseReport{
			SkippedLines: parseResult.SkippedLines,
			Samples:      parseResult.MalformedSamples,
		}
	}

	r.Messages = buildMessageReport(messages)
	r.Usage = buildUsageReport(messages)
	r.Insights = buildInsightsReport(messages)
	return r
}

func buildDirectoryReport(dir string) *directoryReport {
	abs, _ := filepath.Abs(dir)
	entries, err := os.ReadDir(abs)
	if err != nil {
		fmt.Fprintf(os.Stderr, "error reading directory: %v\n", err)
		os.Exit(1)
	}

	report := &directoryReport{Path: abs}
	for _, e := range entries {
		if !e.IsDir() && strings.HasSuffix(e.Name(), ".jsonl") {
			report.Sessions = append(report.Sessions, buildFileReport(filepath.Join(abs, e.Name())))
		}
	}
	return report
}

func buildLookupReport(claudeDir, sessionID string) *lookupReport {
	r := &lookupReport{SessionID: sessionID}

	if err := pathutil.ValidateSessionID(sessionID); err != nil {
		r.Problems = append(r.Problems, fmt.Sprintf("invalid session ID: %v", err))
		return r
	}
	r.Valid = true

	historyPath := filepath.Join(claudeDir, "history.jsonl")
	f, err := os.Open(historyPath)
	if err != nil {
		r.Problems = append(r.Problems, fmt.Sprintf("cannot open history.jsonl: %v", err))
		return r
	}
	entries, _, err := claude.ParseHistoryFile(f)
	f.Close()
	if err != nil {
		r.Problems = append(r.Problems, fmt.Sprintf("error parsing history: %v", err))
		return r
	}

	var matched []claude.HistoryEntry
	for _, e := range entries {
		if e.SessionID == sessionID {
			matched = append(matched, e)
		}
	}
	r.HistoryHits = len(matched)

	if len(matched) == 0 {
		r.Problems = append(r.Problems, "session not found in history.jsonl")
		return r
	}

	entry := matched[len(matched)-1]
	r.Project = entry.Project
	r.Timestamp = time.UnixMilli(entry.Timestamp.Int64()).Format(time.RFC3339)

	encoded := claude.EncodeProjectPath(entry.Project)
	expectedDir := filepath.Join(claudeDir, "projects", encoded)
	sessionPath := filepath.Join(expectedDir, sessionID+".jsonl")

	res := &resolutionReport{
		EncodedPath: encoded,
		ExpectedDir: expectedDir,
		FilePath:    sessionPath,
	}
	r.Resolution = res

	if _, err := os.Stat(expectedDir); err != nil {
		res.DirExists = false
		r.Problems = append(r.Problems, "encoded directory does not exist")

		projectsDir := filepath.Join(claudeDir, "projects")
		dirEntries, _ := os.ReadDir(projectsDir)
		basename := filepath.Base(entry.Project)
		for _, d := range dirEntries {
			if !d.IsDir() {
				continue
			}
			if strings.Contains(d.Name(), strings.ReplaceAll(basename, "_", "-")) ||
				strings.Contains(d.Name(), basename) {
				candidateFile := filepath.Join(projectsDir, d.Name(), sessionID+".jsonl")
				if _, err := os.Stat(candidateFile); err == nil {
					res.Candidates = append(res.Candidates, candidateFile)
				}
			}
		}
		return r
	}
	res.DirExists = true

	if _, err := os.Stat(sessionPath); err != nil {
		res.FileExists = false
		r.Problems = append(r.Problems, "session file does not exist at expected path")
		return r
	}
	res.FileExists = true

	idx := &session.Index{Sessions: []session.SessionMeta{{
		SessionID: sessionID,
		Project:   entry.Project,
		Timestamp: entry.Timestamp.Int64(),
	}}}
	idx.Enrich(claudeDir)
	sessions := idx.GetSessions()

	if len(sessions) == 0 {
		r.Enrichment = &enrichmentReport{Success: false}
		r.Problems = append(r.Problems, "session removed during enrichment (file not found at computed path)")
		return r
	}

	s := sessions[0]
	r.Enrichment = &enrichmentReport{
		Success:  true,
		Messages: s.MessageCount,
		Model:    s.Model,
		Slug:     s.Slug,
		Activity: s.ActivityState,
	}
	r.Usage = &usageReport{
		InputTokens:         s.Usage.InputTokens,
		OutputTokens:        s.Usage.OutputTokens,
		CacheCreationTokens: s.Usage.CacheCreationInputTokens,
		CacheReadTokens:     s.Usage.CacheReadInputTokens,
		TotalTokens:         s.Usage.InputTokens + s.Usage.OutputTokens + s.Usage.CacheCreationInputTokens + s.Usage.CacheReadInputTokens,
		Cost:                s.Usage.CostUSD,
	}

	sf, err := os.Open(sessionPath)
	if err == nil {
		defer sf.Close()
		messages, _, _ := claude.ParseSessionFile(sf)
		r.Messages = buildMessageReport(messages)
		r.Insights = buildInsightsReport(messages)
	}

	return r
}

func buildMessageReport(messages []claude.Message) *messageReport {
	r := &messageReport{
		Total:  len(messages),
		ByType: make(map[string]int),
	}

	var firstTS, lastTS int64
	for _, msg := range messages {
		r.ByType[string(msg.Type)]++
		ts := msg.Timestamp.Int64()
		if ts > 0 {
			if firstTS == 0 || ts < firstTS {
				firstTS = ts
			}
			if ts > lastTS {
				lastTS = ts
			}
		}
		if msg.Type == claude.MessageTypeAssistant && msg.Message != nil && r.Model == "" {
			r.Model = msg.Message.Model
		}
	}

	if firstTS > 0 {
		r.First = time.UnixMilli(firstTS).Format(time.RFC3339)
	}
	if lastTS > 0 {
		r.Last = time.UnixMilli(lastTS).Format(time.RFC3339)
	}
	if firstTS > 0 && lastTS > 0 {
		r.Duration = (time.Duration(lastTS-firstTS) * time.Millisecond).String()
	}

	return r
}

func buildUsageReport(messages []claude.Message) *usageReport {
	var u usageReport
	for _, msg := range messages {
		if msg.Type != claude.MessageTypeAssistant || msg.Message == nil || msg.Message.Usage == nil {
			continue
		}
		mu := msg.Message.Usage
		u.InputTokens += mu.InputTokens
		u.OutputTokens += mu.OutputTokens
		u.CacheCreationTokens += mu.CacheCreationInputTokens
		u.CacheReadTokens += mu.CacheReadInputTokens
	}
	u.TotalTokens = u.InputTokens + u.OutputTokens + u.CacheCreationTokens + u.CacheReadTokens
	return &u
}

func buildInsightsReport(messages []claude.Message) *insightsReport {
	ins := insights.Extract(messages)
	r := &insightsReport{
		FilesRead:    len(ins.Files.Categories.Read),
		BashCommands: len(ins.Commands),
	}

	for _, path := range ins.Files.Categories.Written {
		r.FilesWritten = append(r.FilesWritten, redact.MaskHomePath(path))
	}

	for _, t := range ins.Tools {
		r.Tools = append(r.Tools, toolEntry{Name: t.Name, Count: t.Count})
	}
	for _, e := range ins.Errors {
		r.Errors = append(r.Errors, errorDetail{ToolName: e.ToolName, Snippet: e.Snippet})
	}
	for _, s := range ins.Subagents {
		r.Subagents = append(r.Subagents, subagentDetail{Description: s.Description, TurnCount: s.TurnCount})
	}
	for _, s := range ins.Skills {
		r.Skills = append(r.Skills, toolEntry{Name: s.Name, Count: s.Count})
	}

	return r
}

// --- Output ---

func unwrapReport(r inspectReport) any {
	switch {
	case r.Lookup != nil:
		return r.Lookup
	case r.File != nil:
		return r.File
	case r.Directory != nil:
		return r.Directory
	default:
		return r
	}
}

func outputAny(v any, asJSON bool) {
	if asJSON {
		enc := json.NewEncoder(os.Stdout)
		enc.SetIndent("", "  ")
		_ = enc.Encode(v)
		return
	}

	enc := yaml.NewEncoder(os.Stdout)
	enc.SetIndent(2)
	_ = enc.Encode(v)
	_ = enc.Close()
}

// --- Helpers ---

func discoverAndEnrich(claudeDir string, dirs []string) (*session.Index, error) {
	idx, err := session.Discover(claudeDir, dirs)
	if err != nil {
		return nil, err
	}
	idx.Enrich(claudeDir)
	return idx, nil
}

func doSearch(idx *session.Index, claudeDir, query string, limit int) searchReport {
	results := search.Search(context.Background(), idx, search.Options{
		Query:     query,
		Limit:     limit,
		ClaudeDir: claudeDir,
	})

	report := searchReport{
		Query: query,
		Total: len(results),
	}
	for _, r := range results {
		report.Results = append(report.Results, searchResultEntry{
			SessionID: r.Meta.SessionID,
			Project:   r.Meta.Project,
			Slug:      r.Meta.Slug,
			Model:     r.Meta.Model,
			Timestamp: time.UnixMilli(r.Meta.Timestamp).Format(time.RFC3339),
			Snippet:   r.Snippet,
		})
	}
	return report
}

func openBrowser(url string) {
	var cmd *exec.Cmd
	switch runtime.GOOS {
	case "darwin":
		cmd = exec.Command("open", url)
	case "linux":
		cmd = exec.Command("xdg-open", url)
	case "windows":
		cmd = exec.Command("rundll32", "url.dll,FileProtocolHandler", url)
	default:
		return
	}
	_ = cmd.Run()
}
