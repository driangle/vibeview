package main

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"time"

	"github.com/driangle/vibeview/internal/logutil"
	"github.com/driangle/vibeview/internal/session"
	"github.com/spf13/cobra"
)

// --- JSON output types ---

type sessionsJSON struct {
	Sessions []sessionEntry `json:"sessions"`
	Total    int            `json:"total"`
	Limit    int            `json:"limit"`
	Offset   int            `json:"offset"`
}

type sessionEntry struct {
	ID           string  `json:"id"`
	Title        string  `json:"title"`
	Dir          string  `json:"dir"`
	Model        string  `json:"model"`
	Timestamp    string  `json:"timestamp"`
	MessageCount int     `json:"message_count"`
	CostUSD      float64 `json:"cost_usd"`
}

func toSessionEntry(s session.SessionMeta) sessionEntry {
	title := s.CustomTitle
	if title == "" {
		title = s.Slug
	}

	var ts string
	if s.Timestamp > 0 {
		ts = time.UnixMilli(s.Timestamp).UTC().Format(time.RFC3339)
	}

	return sessionEntry{
		ID:           s.SessionID,
		Title:        title,
		Dir:          s.Project,
		Model:        s.Model,
		Timestamp:    ts,
		MessageCount: s.MessageCount,
		CostUSD:      s.Usage.CostUSD,
	}
}

// --- Sorting ---

func sortSessions(sessions []session.SessionMeta, field string) {
	switch field {
	case "cost":
		sort.Slice(sessions, func(i, j int) bool {
			return sessions[i].Usage.CostUSD > sessions[j].Usage.CostUSD
		})
	case "messages":
		sort.Slice(sessions, func(i, j int) bool {
			return sessions[i].MessageCount > sessions[j].MessageCount
		})
	case "model":
		sort.Slice(sessions, func(i, j int) bool {
			return sessions[i].Model < sessions[j].Model
		})
	case "dir":
		sort.Slice(sessions, func(i, j int) bool {
			return sessions[i].Project < sessions[j].Project
		})
	default: // "timestamp"
		sort.Slice(sessions, func(i, j int) bool {
			return sessions[i].Timestamp > sessions[j].Timestamp
		})
	}
}

// --- Table rendering ---

func renderSessionsTable(sessions []session.SessionMeta, total, offset int) {
	headers := []string{"ID", "TITLE", "DIRECTORY", "MODEL", "DATE", "MSGS", "COST"}
	widths := []int{8, 30, 20, 18, 20, 5, 8}

	rows := make([]tableRow, len(sessions))
	for i, s := range sessions {
		title := s.CustomTitle
		if title == "" {
			title = s.Slug
		}
		title = truncateStr(title, widths[1])

		dir := filepath.Base(s.Project)
		if dir == "." || dir == "" {
			dir = s.Project
		}
		dir = truncateStr(dir, widths[2])

		model := truncateStr(s.Model, widths[3])

		var date string
		if s.Timestamp > 0 {
			t := time.UnixMilli(s.Timestamp)
			date = t.Format("2006-01-02 15:04")
		}

		rows[i] = tableRow{cols: []string{
			s.SessionID[:min(8, len(s.SessionID))],
			title,
			dir,
			model,
			date,
			fmt.Sprintf("%d", s.MessageCount),
			formatCost(s.Usage.CostUSD),
		}}
	}

	renderTable(os.Stdout, headers, rows, widths)

	// Show pagination info.
	end := offset + len(sessions)
	fmt.Fprintf(os.Stderr, "\nShowing %d-%d of %d sessions\n", offset+1, end, total)
}

func truncateStr(s string, maxLen int) string {
	if len(s) <= maxLen {
		return s
	}
	if maxLen <= 3 {
		return s[:maxLen]
	}
	return s[:maxLen-3] + "..."
}

// sortNeedsEnrichment reports whether the sort field requires data that is
// only available after enriching sessions (reading JSONL files).
// Timestamp and dir are available from discovery alone.
func sortNeedsEnrichment(field string) bool {
	switch field {
	case "timestamp", "dir":
		return false
	default:
		return true
	}
}

func paginateSessions(sessions []session.SessionMeta, offset, limit int) []session.SessionMeta {
	if offset > len(sessions) {
		offset = len(sessions)
	}
	sessions = sessions[offset:]
	if limit > 0 && limit < len(sessions) {
		sessions = sessions[:limit]
	}
	return sessions
}

// enrichSessions enriches specific sessions by their IDs.
func enrichSessions(idx *session.Index, claudeDir string, sessions []session.SessionMeta) []session.SessionMeta {
	for _, s := range sessions {
		idx.EnrichSession(claudeDir, s.SessionID)
	}
	// Re-fetch from index to get enriched data.
	enriched := make([]session.SessionMeta, 0, len(sessions))
	for _, s := range sessions {
		if found := idx.FindSession(s.SessionID); found != nil {
			enriched = append(enriched, *found)
		}
	}
	return enriched
}

// --- Command ---

func sessionsCmd(claudeDir *string, logLevel *string) *cobra.Command {
	var (
		jsonOutput bool
		limit      int
		offset     int
		dirFilter  string
		sortField  string
	)

	cmd := &cobra.Command{
		Use:   "sessions",
		Short: "List sessions in a table",
		Long: `List all Claude Code sessions in a formatted table.

Supports filtering by directory, sorting by various columns, pagination,
and JSON output for scripting.

Examples:
  vibeview sessions
  vibeview sessions --json
  vibeview sessions --dir myproject --limit 10
  vibeview sessions --sort cost
  vibeview sessions --limit 10 --offset 20`,
		Args: cobra.NoArgs,
		Run: func(cmd *cobra.Command, args []string) {
			logutil.SetLevel(logutil.ParseLevel(*logLevel))

			dir := resolveClaudeDir(cmd, *claudeDir)
			fmt.Fprintf(os.Stderr, "Discovering sessions in: %s\n", dir)

			needsFullEnrich := sortNeedsEnrichment(sortField)

			var idx *session.Index
			var err error

			if needsFullEnrich {
				idx, err = discoverAndEnrich(dir, nil)
			} else {
				idx, err = session.Discover(dir, nil)
			}
			if err != nil {
				fmt.Fprintf(os.Stderr, "error discovering sessions: %v\n", err)
				os.Exit(1)
			}

			var sessions []session.SessionMeta
			if dirFilter != "" {
				sessions = idx.FilterByProject(dirFilter)
			} else {
				sessions = idx.GetSessions()
			}

			sortSessions(sessions, sortField)

			total := len(sessions)
			page := paginateSessions(sessions, offset, limit)

			// In the fast path, enrich only the page we're displaying.
			if !needsFullEnrich {
				page = enrichSessions(idx, dir, page)
			}

			if jsonOutput {
				entries := make([]sessionEntry, len(page))
				for i, s := range page {
					entries[i] = toSessionEntry(s)
				}
				out := sessionsJSON{
					Sessions: entries,
					Total:    total,
					Limit:    limit,
					Offset:   offset,
				}
				enc := json.NewEncoder(os.Stdout)
				enc.SetIndent("", "  ")
				_ = enc.Encode(out)
				return
			}

			if len(page) == 0 {
				fmt.Fprintln(os.Stderr, "No sessions found.")
				return
			}

			renderSessionsTable(page, total, offset)
		},
	}

	cmd.Flags().BoolVar(&jsonOutput, "json", false, "output as JSON")
	cmd.Flags().IntVar(&limit, "limit", 25, "maximum number of sessions to show")
	cmd.Flags().IntVar(&offset, "offset", 0, "number of sessions to skip")
	cmd.Flags().StringVar(&dirFilter, "dir", "", "filter by project directory (substring match)")
	cmd.Flags().StringVar(&sortField, "sort", "timestamp", "sort by: timestamp, cost, messages, model, dir")

	return cmd
}
