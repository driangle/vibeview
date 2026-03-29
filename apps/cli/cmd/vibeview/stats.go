package main

import (
	"fmt"
	"io"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"

	"github.com/driangle/vibeview/internal/logutil"
	"github.com/driangle/vibeview/internal/session"
	"github.com/spf13/cobra"
)

// --- Report types ---

type statsReport struct {
	Title              string           `json:"title,omitempty" yaml:"title,omitempty"`
	TotalSessions      int              `json:"total_sessions" yaml:"total_sessions"`
	TotalMessages      int              `json:"total_messages" yaml:"total_messages"`
	TotalCostUSD       *float64         `json:"total_cost_usd,omitempty" yaml:"total_cost_usd,omitempty"`
	TotalTokens        int              `json:"total_tokens" yaml:"total_tokens"`
	InputTokens        int              `json:"input_tokens" yaml:"input_tokens"`
	OutputTokens       int              `json:"output_tokens" yaml:"output_tokens"`
	CacheTokens        int              `json:"cache_tokens" yaml:"cache_tokens"`
	DateRange          *statsDateRange  `json:"date_range,omitempty" yaml:"date_range,omitempty"`
	Models             []modelBreakdown `json:"models,omitempty" yaml:"models,omitempty"`
	AvgSessionCostUSD  *float64         `json:"avg_session_cost_usd,omitempty" yaml:"avg_session_cost_usd,omitempty"`
	AvgSessionDuration string           `json:"avg_session_duration,omitempty" yaml:"avg_session_duration,omitempty"`
}

type statsDateRange struct {
	First string `json:"first" yaml:"first"`
	Last  string `json:"last" yaml:"last"`
}

type modelBreakdown struct {
	Model    string   `json:"model" yaml:"model"`
	Sessions int      `json:"sessions" yaml:"sessions"`
	CostUSD  *float64 `json:"cost_usd,omitempty" yaml:"cost_usd,omitempty"`
}

// --- Command ---

func statsCmd(claudeDir *string, logLevel *string) *cobra.Command {
	var jsonOutput bool
	var yamlOutput bool
	var dirsFlag string

	cmd := &cobra.Command{
		Use:   "stats [folder | session.jsonl]",
		Short: "Show aggregate project usage summary",
		Long: `Display an aggregate usage summary across all Claude Code sessions.

Input can be:
  - No arguments: uses ~/.claude (or CLAUDE_CONFIG_DIR env var)
  - A folder path: filters sessions for that project
  - A .jsonl file: analyzes a single session

Examples:
  vibeview stats
  vibeview stats --json
  vibeview stats --dirs myproject
  vibeview stats /path/to/project
  vibeview stats session.jsonl`,
		Args: cobra.MaximumNArgs(1),
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

			var sessions []session.SessionMeta

			if len(args) == 1 {
				target := args[0]
				info, statErr := os.Stat(target)

				switch {
				case statErr == nil && !info.IsDir() && strings.HasSuffix(target, ".jsonl"):
					// Single session file.
					fmt.Fprintf(os.Stderr, "Analyzing session file: %s\n", target)
					idx, err := session.LoadFromPaths([]string{target})
					if err != nil {
						fmt.Fprintf(os.Stderr, "error: %v\n", err)
						os.Exit(1)
					}
					sessions = idx.GetSessions()

				case statErr == nil:
					// Folder path — filter sessions for that project.
					abs, _ := os.Getwd()
					if filepath.IsAbs(target) {
						abs = target
					} else {
						abs = filepath.Join(abs, target)
					}
					fmt.Fprintf(os.Stderr, "Analyzing sessions for project: %s\n", abs)
					dir := resolveClaudeDir(cmd, *claudeDir)
					idx, err := discoverAndEnrich(dir, dirs)
					if err != nil {
						fmt.Fprintf(os.Stderr, "error discovering sessions: %v\n", err)
						os.Exit(1)
					}
					sessions = idx.FilterByProject(abs)

				default:
					// Not a file/dir — treat as session ID.
					fmt.Fprintf(os.Stderr, "Analyzing session: %s\n", target)
					dir := resolveClaudeDir(cmd, *claudeDir)
					idx, err := session.Discover(dir, dirs)
					if err != nil {
						fmt.Fprintf(os.Stderr, "error discovering sessions: %v\n", err)
						os.Exit(1)
					}
					s := idx.FindSession(target)
					if s == nil {
						fmt.Fprintf(os.Stderr, "error: session %q not found\n", target)
						os.Exit(1)
					}
					idx.EnrichSession(dir, target)
					s = idx.FindSession(target)
					sessions = []session.SessionMeta{*s}
				}
			} else {
				dir := resolveClaudeDir(cmd, *claudeDir)
				fmt.Fprintf(os.Stderr, "Analyzing all sessions in: %s\n", dir)
				idx, err := discoverAndEnrich(dir, dirs)
				if err != nil {
					fmt.Fprintf(os.Stderr, "error discovering sessions: %v\n", err)
					os.Exit(1)
				}
				sessions = idx.GetSessions()
			}

			report := buildStatsReport(sessions)

			// For single-session analysis, include the session title.
			if len(sessions) == 1 {
				if t := sessions[0].CustomTitle; t != "" {
					report.Title = t
				} else if t := sessions[0].Slug; t != "" {
					report.Title = t
				}
			}

			switch {
			case jsonOutput:
				outputAny(report, true)
			case yamlOutput:
				outputAny(report, false)
			default:
				renderStatsStyled(os.Stdout, report)
			}
		},
	}

	cmd.Flags().BoolVar(&jsonOutput, "json", false, "output as JSON")
	cmd.Flags().BoolVar(&yamlOutput, "yaml", false, "output as YAML")
	cmd.Flags().StringVar(&dirsFlag, "dirs", "", "comma-separated project directory names to filter")

	return cmd
}

// resolveClaudeDir returns the effective claude directory, checking the
// CLAUDE_CONFIG_DIR env var as a fallback when --claude-dir was not explicitly set.
func resolveClaudeDir(cmd *cobra.Command, flagValue string) string {
	if !cmd.Flags().Changed("claude-dir") {
		if envDir := os.Getenv("CLAUDE_CONFIG_DIR"); envDir != "" {
			return envDir
		}
	}
	return flagValue
}

// --- Aggregation ---

func buildStatsReport(sessions []session.SessionMeta) statsReport {
	r := statsReport{}
	r.TotalSessions = len(sessions)
	if len(sessions) == 0 {
		return r
	}

	var minTS, maxTS int64
	modelMap := make(map[string]*modelBreakdown)
	var totalDurationMs int64
	var sessionsWithDuration int
	var totalCost float64
	hasCost := false

	for _, s := range sessions {
		r.TotalMessages += s.MessageCount
		r.InputTokens += s.Usage.InputTokens
		r.OutputTokens += s.Usage.OutputTokens
		r.CacheTokens += s.Usage.CacheCreationInputTokens + s.Usage.CacheReadInputTokens

		if s.Usage.CostUSD > 0 {
			totalCost += s.Usage.CostUSD
			hasCost = true
		}

		if s.Timestamp > 0 {
			if minTS == 0 || s.Timestamp < minTS {
				minTS = s.Timestamp
			}
			if s.Timestamp > maxTS {
				maxTS = s.Timestamp
			}
		}

		if s.DurationMs > 0 {
			totalDurationMs += s.DurationMs
			sessionsWithDuration++
		}

		model := s.Model
		if model == "" {
			model = "(unknown)"
		}
		mb, ok := modelMap[model]
		if !ok {
			mb = &modelBreakdown{Model: model}
			modelMap[model] = mb
		}
		mb.Sessions++
		if s.Usage.CostUSD > 0 {
			cost := mb.CostUSD
			if cost == nil {
				cost = new(float64)
			}
			*cost += s.Usage.CostUSD
			mb.CostUSD = cost
		}
	}

	r.TotalTokens = r.InputTokens + r.OutputTokens + r.CacheTokens

	if hasCost {
		r.TotalCostUSD = &totalCost
		avg := totalCost / float64(r.TotalSessions)
		r.AvgSessionCostUSD = &avg
	}

	if minTS > 0 {
		r.DateRange = &statsDateRange{
			First: time.UnixMilli(minTS).Format(time.RFC3339),
			Last:  time.UnixMilli(maxTS).Format(time.RFC3339),
		}
	}

	for _, mb := range modelMap {
		r.Models = append(r.Models, *mb)
	}
	sort.Slice(r.Models, func(i, j int) bool {
		return r.Models[i].Sessions > r.Models[j].Sessions
	})

	if sessionsWithDuration > 0 {
		avgMs := totalDurationMs / int64(sessionsWithDuration)
		r.AvgSessionDuration = (time.Duration(avgMs) * time.Millisecond).String()
	}

	return r
}

// --- Styled rendering ---

func renderStatsStyled(w io.Writer, r statsReport) {
	hasCost := r.TotalCostUSD != nil

	fmt.Fprintln(w, sectionTitle("Summary"))
	if r.Title != "" {
		fmt.Fprintln(w, row("Title", r.Title))
	}
	fmt.Fprintln(w, row("Sessions", formatCommas(r.TotalSessions)))
	fmt.Fprintln(w, row("Messages", formatCommas(r.TotalMessages)))
	if hasCost {
		fmt.Fprintln(w, row("Cost", formatCost(*r.TotalCostUSD)))
	}

	tokenStr := fmt.Sprintf("%s total", formatCommas(r.TotalTokens))
	if r.InputTokens > 0 || r.OutputTokens > 0 {
		tokenStr += fmt.Sprintf("  (In: %s  Out: %s", formatCommas(r.InputTokens), formatCommas(r.OutputTokens))
		if r.CacheTokens > 0 {
			tokenStr += fmt.Sprintf("  Cache: %s", formatCommas(r.CacheTokens))
		}
		tokenStr += ")"
	}
	fmt.Fprintln(w, row("Tokens", tokenStr))
	fmt.Fprintln(w)

	if r.DateRange != nil {
		fmt.Fprintln(w, sectionTitle("Date Range"))
		fmt.Fprintln(w, row("First", formatTimestamp(r.DateRange.First)))
		fmt.Fprintln(w, row("Last", formatTimestamp(r.DateRange.Last)))
		fmt.Fprintln(w)
	}

	if len(r.Models) > 0 {
		fmt.Fprintln(w, sectionTitle("Models"))
		if hasCost {
			headers := []string{"Model", "Sessions", "Cost"}
			widths := []int{40, 10, 10}
			var rows []tableRow
			for _, m := range r.Models {
				cost := "-"
				if m.CostUSD != nil {
					cost = formatCost(*m.CostUSD)
				}
				rows = append(rows, tableRow{cols: []string{
					m.Model, formatCommas(m.Sessions), cost,
				}})
			}
			renderTable(w, headers, rows, widths)
		} else {
			headers := []string{"Model", "Sessions"}
			widths := []int{40, 10}
			var rows []tableRow
			for _, m := range r.Models {
				rows = append(rows, tableRow{cols: []string{
					m.Model, formatCommas(m.Sessions),
				}})
			}
			renderTable(w, headers, rows, widths)
		}
		fmt.Fprintln(w)
	}

	hasAvg := hasCost || r.AvgSessionDuration != ""
	if hasAvg {
		fmt.Fprintln(w, sectionTitle("Averages"))
		if hasCost {
			fmt.Fprintln(w, row("Cost", formatCost(*r.AvgSessionCostUSD)+"/session"))
		}
		if r.AvgSessionDuration != "" {
			fmt.Fprintln(w, row("Duration", r.AvgSessionDuration+"/session"))
		}
		fmt.Fprintln(w)
	}
}
