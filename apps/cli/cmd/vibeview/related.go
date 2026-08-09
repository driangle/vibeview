package main

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"time"

	"github.com/driangle/vibeview/apps/lib/logutil"
	"github.com/driangle/vibeview/apps/lib/session"
	"github.com/driangle/vibeview/internal/features"
	"github.com/spf13/cobra"
)

// --- JSON output types ---

type relatedJSON struct {
	Target    sessionEntry    `json:"target"`
	Subagents []subagentEntry `json:"subagents"`
	Siblings  []sessionEntry  `json:"siblings"`
	GapMs     int64           `json:"gapMs"`
}

type subagentEntry struct {
	AgentID      string `json:"agent_id"`
	AgentType    string `json:"agent_type"`
	Description  string `json:"description"`
	MessageCount int    `json:"message_count"`
	TurnCount    int    `json:"turn_count"`
}

func toSubagentEntry(s session.SubagentInfo) subagentEntry {
	return subagentEntry{
		AgentID:      s.AgentID,
		AgentType:    s.AgentType,
		Description:  s.Description,
		MessageCount: s.MessageCount,
		TurnCount:    s.TurnCount,
	}
}

// --- Command ---

func relatedCmd(claudeDir *string, logLevel *string) *cobra.Command {
	var (
		jsonOutput  bool
		gap         time.Duration
		noSubagents bool
		noSiblings  bool
		noColor     bool
	)

	cmd := &cobra.Command{
		Use:   "related <session-id>",
		Short: "Group a session with its subagents and time-clustered siblings",
		Long: `Reconstruct a whole multi-agent work episode from a single session ID.

Given a session, related shows:
  - Subagent transcripts spawned by the session (its subagents/ directory), and
  - Sibling sessions from the same project whose time windows cluster with it.

Input is a session ID (full or prefix match). Sibling clustering is limited to
the same project and to sessions within --gap of the target's time window.

Examples:
  vibeview related 877fff1e-80c9-4d20-a600-f278eb2c7bdc
  vibeview related 877fff
  vibeview related --gap 1h 877fff1e
  vibeview related --no-siblings 877fff1e
  vibeview related --json 877fff1e`,
		Args: cobra.ExactArgs(1),
		Run: func(cmd *cobra.Command, args []string) {
			logutil.SetLevel(logutil.ParseLevel(*logLevel))

			if noColor {
				colorEnabled = false
			}

			dir := resolveClaudeDir(cmd, *claudeDir)
			result, err := buildRelated(dir, args[0], relatedOptions{
				gap:         gap,
				noSubagents: noSubagents,
				noSiblings:  noSiblings,
			})
			if err != nil {
				fmt.Fprintf(os.Stderr, "error: %v\n", err)
				os.Exit(1)
			}

			if jsonOutput {
				enc := json.NewEncoder(os.Stdout)
				enc.SetIndent("", "  ")
				if err := enc.Encode(result.toJSON()); err != nil {
					fmt.Fprintf(os.Stderr, "error: %v\n", err)
					os.Exit(1)
				}
				return
			}

			renderRelated(os.Stdout, result)
		},
	}

	cmd.Flags().BoolVar(&jsonOutput, "json", false, "output as JSON")
	cmd.Flags().DurationVar(&gap, "gap", 30*time.Minute, "max gap between time windows to cluster siblings")
	cmd.Flags().BoolVar(&noSubagents, "no-subagents", false, "skip the subagents section")
	cmd.Flags().BoolVar(&noSiblings, "no-siblings", false, "skip the sibling-sessions section")
	cmd.Flags().BoolVar(&noColor, "no-color", false, "strip ANSI color codes")

	return cmd
}

// --- Assembly ---

type relatedOptions struct {
	gap         time.Duration
	noSubagents bool
	noSiblings  bool
}

type relatedResult struct {
	target    session.SessionMeta
	subagents []session.SubagentInfo
	siblings  []session.SessionMeta
	gapMs     int64
}

func (r relatedResult) toJSON() relatedJSON {
	subagents := make([]subagentEntry, len(r.subagents))
	for i, s := range r.subagents {
		subagents[i] = toSubagentEntry(s)
	}
	siblings := make([]sessionEntry, len(r.siblings))
	for i, s := range r.siblings {
		siblings[i] = toSessionEntry(s)
	}
	return relatedJSON{
		Target:    toSessionEntry(r.target),
		Subagents: subagents,
		Siblings:  siblings,
		GapMs:     r.gapMs,
	}
}

// buildRelated resolves the target session and gathers its subagents and
// time-clustered same-project siblings.
func buildRelated(claudeDir, target string, opts relatedOptions) (relatedResult, error) {
	idx, err := session.Discover(claudeDir, nil)
	if err != nil {
		return relatedResult{}, fmt.Errorf("discovering sessions: %w", err)
	}

	meta, err := resolveTarget(idx, target)
	if err != nil {
		return relatedResult{}, err
	}

	// Capture the project as discovered (from history), before enrichment.
	// Enrichment may rewrite the project path (e.g. re-encode when no cwd is
	// present), which would no longer match the un-enriched candidate metas.
	projectFilter := meta.Project

	// Enrich the target so its time window is accurate.
	idx.EnrichSession(claudeDir, meta.SessionID)
	if enriched := idx.FindSession(meta.SessionID); enriched != nil {
		meta = *enriched
	}

	result := relatedResult{target: meta, gapMs: opts.gap.Milliseconds()}

	if !opts.noSubagents {
		subagents, err := session.ListSubagents(claudeDir, meta)
		if err != nil {
			return relatedResult{}, fmt.Errorf("listing subagents: %w", err)
		}
		result.subagents = subagents
	}

	if !opts.noSiblings {
		candidates := enrichSessions(idx, claudeDir, idx.FilterByProject(projectFilter))
		result.siblings = session.ClusterByTime(meta, candidates, result.gapMs)
	}

	return result, nil
}

// resolveTarget looks up a session by exact ID, then by prefix.
func resolveTarget(idx *session.Index, target string) (session.SessionMeta, error) {
	if meta := idx.FindSession(target); meta != nil {
		return *meta, nil
	}
	meta, err := idx.FindSessionByPrefix(target)
	if err != nil {
		return session.SessionMeta{}, err
	}
	return *meta, nil
}

// --- Rendering ---

func renderRelated(w *os.File, r relatedResult) {
	fmt.Fprintln(w, sectionTitle("Session"))
	fmt.Fprintln(w, row("ID", r.target.SessionID))
	title := r.target.CustomTitle
	if title == "" {
		title = r.target.Slug
	}
	if title != "" {
		fmt.Fprintln(w, row("Title", title))
	}
	if r.target.Project != "" {
		fmt.Fprintln(w, row("Project", filepath.Base(r.target.Project)))
	}
	if r.target.Timestamp > 0 {
		fmt.Fprintln(w, row("Started", formatTimestamp(time.UnixMilli(r.target.Timestamp).Format(time.RFC3339))))
	}
	fmt.Fprintln(w)

	renderSubagentsSection(w, r.subagents)
	renderSiblingsSection(w, r.siblings)
}

func renderSubagentsSection(w *os.File, subagents []session.SubagentInfo) {
	fmt.Fprintln(w, sectionTitle(fmt.Sprintf("Subagents (%d)", len(subagents))))
	if len(subagents) == 0 {
		fmt.Fprintln(w, rowIndent(dim("none")))
		fmt.Fprintln(w)
		return
	}

	headers := []string{"AGENT ID", "TYPE", "DESCRIPTION", "MSGS", "TURNS"}
	widths := []int{18, 16, 34, 5, 5}
	rows := make([]tableRow, len(subagents))
	for i, s := range subagents {
		desc := s.Description
		if desc == "" {
			desc = "(no description)"
		}
		rows[i] = tableRow{cols: []string{
			truncateStr(s.AgentID, widths[0]),
			truncateStr(s.AgentType, widths[1]),
			truncateStr(desc, widths[2]),
			fmt.Sprintf("%d", s.MessageCount),
			fmt.Sprintf("%d", s.TurnCount),
		}}
	}
	renderTable(w, headers, rows, widths)
	fmt.Fprintln(w)
}

func renderSiblingsSection(w *os.File, siblings []session.SessionMeta) {
	fmt.Fprintln(w, sectionTitle(fmt.Sprintf("Sibling sessions (%d)", len(siblings))))
	if len(siblings) == 0 {
		fmt.Fprintln(w, rowIndent(dim("none")))
		fmt.Fprintln(w)
		return
	}

	// Cost display is gated behind VIBEVIEW_COST_ENABLED (see docs/cost.md).
	showCost := features.CostUIEnabled()

	headers := []string{"ID", "TITLE", "DATE", "MSGS"}
	widths := []int{8, 36, 20, 5}
	if showCost {
		headers = append(headers, "COST")
		widths = append(widths, 8)
	}
	rows := make([]tableRow, len(siblings))
	for i, s := range siblings {
		title := s.CustomTitle
		if title == "" {
			title = s.Slug
		}
		var date string
		if s.Timestamp > 0 {
			date = time.UnixMilli(s.Timestamp).Format("2006-01-02 15:04")
		}
		cols := []string{
			s.SessionID[:min(8, len(s.SessionID))],
			truncateStr(title, widths[1]),
			date,
			fmt.Sprintf("%d", s.MessageCount),
		}
		if showCost {
			cols = append(cols, formatCost(s.Usage.CostUSD))
		}
		rows[i] = tableRow{cols: cols}
	}
	renderTable(w, headers, rows, widths)
	fmt.Fprintln(w)
}
