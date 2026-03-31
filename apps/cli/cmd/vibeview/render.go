package main

import (
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/driangle/vibeview/internal/redact"
)

// --- Color / style ---

var colorEnabled = detectColor()

func detectColor() bool {
	if os.Getenv("NO_COLOR") != "" {
		return false
	}
	fi, err := os.Stdout.Stat()
	if err != nil {
		return false
	}
	return fi.Mode()&os.ModeCharDevice != 0
}

func ansi(code, s string) string {
	if !colorEnabled {
		return s
	}
	return "\033[" + code + "m" + s + "\033[0m"
}

func bold(s string) string   { return ansi("1", s) }
func dim(s string) string    { return ansi("2", s) }
func cyan(s string) string   { return ansi("36", s) }
func yellow(s string) string { return ansi("33", s) }
func red(s string) string    { return ansi("31", s) }

// --- Formatting helpers ---

func formatCommas(n int) string {
	if n < 0 {
		return "-" + formatCommas(-n)
	}
	s := fmt.Sprintf("%d", n)
	if len(s) <= 3 {
		return s
	}
	var b strings.Builder
	remainder := len(s) % 3
	if remainder > 0 {
		b.WriteString(s[:remainder])
	}
	for i := remainder; i < len(s); i += 3 {
		if b.Len() > 0 {
			b.WriteByte(',')
		}
		b.WriteString(s[i : i+3])
	}
	return b.String()
}

func formatCost(c float64) string {
	if c == 0 {
		return "$0.00"
	}
	return fmt.Sprintf("$%.2f", c)
}

func relativeTime(rfc3339 string) string {
	t, err := time.Parse(time.RFC3339, rfc3339)
	if err != nil {
		return ""
	}
	d := time.Since(t)
	switch {
	case d < time.Minute:
		return "just now"
	case d < time.Hour:
		m := int(d.Minutes())
		if m == 1 {
			return "1m ago"
		}
		return fmt.Sprintf("%dm ago", m)
	case d < 24*time.Hour:
		h := int(d.Hours())
		if h == 1 {
			return "1h ago"
		}
		return fmt.Sprintf("%dh ago", h)
	default:
		days := int(d.Hours() / 24)
		if days == 1 {
			return "1d ago"
		}
		return fmt.Sprintf("%dd ago", days)
	}
}

func formatTimestamp(rfc3339 string) string {
	t, err := time.Parse(time.RFC3339, rfc3339)
	if err != nil {
		return rfc3339
	}
	rel := relativeTime(rfc3339)
	base := t.Format("2006-01-02 15:04")
	if rel != "" {
		return fmt.Sprintf("%s  (%s)", base, rel)
	}
	return base
}

func formatFileSize(bytes int64) string {
	switch {
	case bytes >= 1<<20:
		return fmt.Sprintf("%.1f MB", float64(bytes)/float64(1<<20))
	case bytes >= 1<<10:
		return fmt.Sprintf("%.1f KB", float64(bytes)/float64(1<<10))
	default:
		return fmt.Sprintf("%d B", bytes)
	}
}

func stripANSI(s string) string {
	var b strings.Builder
	b.Grow(len(s))
	i := 0
	for i < len(s) {
		if s[i] == '\033' && i+1 < len(s) && s[i+1] == '[' {
			j := i + 2
			for j < len(s) && s[j] != 'm' {
				j++
			}
			if j < len(s) {
				i = j + 1
				continue
			}
		}
		b.WriteByte(s[i])
		i++
	}
	return b.String()
}

// --- Layout helpers ---

func sectionTitle(title string) string {
	return bold(cyan(title))
}

func row(label, value string) string {
	return fmt.Sprintf("  %-12s %s", label, value)
}

func rowIndent(content string) string {
	return "  " + content
}

// --- Table rendering ---

type tableRow struct {
	cols []string
}

func renderTable(w io.Writer, headers []string, rows []tableRow, widths []int) {
	var hdr strings.Builder
	for i, h := range headers {
		if i > 0 {
			hdr.WriteString("  ")
		}
		hdr.WriteString(fmt.Sprintf("%-*s", widths[i], h))
	}
	fmt.Fprintln(w, rowIndent(dim(hdr.String())))
	for _, r := range rows {
		var line strings.Builder
		for i, c := range r.cols {
			if i > 0 {
				line.WriteString("  ")
			}
			line.WriteString(fmt.Sprintf("%-*s", widths[i], c))
		}
		fmt.Fprintln(w, rowIndent(line.String()))
	}
}

// --- Main entry point ---

func renderStyled(w io.Writer, report inspectReport, verbose bool) {
	switch {
	case report.Lookup != nil:
		renderLookupStyled(w, report.Lookup, verbose)
	case report.File != nil:
		renderFileStyled(w, report.File, verbose)
	case report.Directory != nil:
		renderDirectoryStyled(w, report.Directory)
	}
}

// --- Lookup report ---

func renderLookupStyled(w io.Writer, r *lookupReport, verbose bool) {
	fmt.Fprintln(w, sectionTitle("Session"))
	fmt.Fprintln(w, row("ID", r.SessionID))
	if r.Project != "" {
		fmt.Fprintln(w, row("Project", redact.MaskHomePath(r.Project)))
	}
	if r.FilePath != "" {
		fmt.Fprintln(w, row("File", redact.MaskHomePath(r.FilePath)))
	}
	if r.Enrichment != nil {
		if r.Enrichment.Slug != "" {
			fmt.Fprintln(w, row("Slug", r.Enrichment.Slug))
		}
	}
	if r.Timestamp != "" {
		fmt.Fprintln(w, row("Started", formatTimestamp(r.Timestamp)))
	}
	if r.Messages != nil && r.Messages.Duration != "" {
		fmt.Fprintln(w, row("Duration", r.Messages.Duration))
	}
	if r.Enrichment != nil {
		if r.Enrichment.Model != "" {
			fmt.Fprintln(w, row("Model", r.Enrichment.Model))
		}
		if r.Enrichment.Activity != "" {
			fmt.Fprintln(w, row("Activity", r.Enrichment.Activity))
		}
	}
	fmt.Fprintln(w)

	if r.Messages != nil {
		renderConversationSection(w, r.Messages, r.Usage)
	}

	if r.Insights != nil {
		renderInsightsSections(w, r.Insights)
	}

	if len(r.Problems) > 0 {
		fmt.Fprintln(w, bold(yellow(fmt.Sprintf("Problems (%d)", len(r.Problems)))))
		for _, p := range r.Problems {
			fmt.Fprintln(w, rowIndent(yellow(p)))
		}
		fmt.Fprintln(w)
	}

	if verbose {
		renderVerboseLookup(w, r)
	}
}

// --- File report ---

func renderFileStyled(w io.Writer, r *fileReport, verbose bool) {
	fmt.Fprintln(w, sectionTitle("File"))
	if r.Title != "" {
		fmt.Fprintln(w, row("Title", r.Title))
	}
	fmt.Fprintln(w, row("Path", redact.MaskHomePath(r.Path)))
	fmt.Fprintln(w, row("Size", formatFileSize(r.Size)))
	fmt.Fprintln(w, row("Modified", formatTimestamp(r.Modified)))
	if r.Messages != nil && r.Messages.Model != "" {
		fmt.Fprintln(w, row("Model", r.Messages.Model))
	}
	if r.Messages != nil && r.Messages.Duration != "" {
		fmt.Fprintln(w, row("Duration", r.Messages.Duration))
	}
	fmt.Fprintln(w)

	if r.Messages != nil {
		renderConversationSection(w, r.Messages, r.Usage)
	}

	if r.Insights != nil {
		renderInsightsSections(w, r.Insights)
	}

	if verbose && r.Parse != nil {
		renderParseSection(w, r.Parse)
	}
}

// --- Directory report ---

func renderDirectoryStyled(w io.Writer, r *directoryReport) {
	fmt.Fprintln(w, sectionTitle("Directory"))
	fmt.Fprintln(w, row("Path", redact.MaskHomePath(r.Path)))
	fmt.Fprintln(w, row("Sessions", fmt.Sprintf("%d", len(r.Sessions))))
	fmt.Fprintln(w)

	if len(r.Sessions) == 0 {
		return
	}

	fmt.Fprintln(w, sectionTitle("Sessions"))
	headers := []string{"File", "Title", "Msgs", "Duration", "Cost"}
	widths := []int{24, 24, 6, 10, 8}
	var rows []tableRow
	for _, s := range r.Sessions {
		name := filepath.Base(s.Path)
		if len(name) > 24 {
			name = name[:21] + "..."
		}
		title := s.Title
		if len(title) > 24 {
			title = title[:21] + "..."
		}
		msgs := "0"
		if s.Messages != nil {
			msgs = fmt.Sprintf("%d", s.Messages.Total)
		}
		dur := "-"
		if s.Messages != nil && s.Messages.Duration != "" {
			dur = s.Messages.Duration
		}
		cost := "-"
		if s.Usage != nil && s.Usage.Cost > 0 {
			cost = formatCost(s.Usage.Cost)
		}
		rows = append(rows, tableRow{cols: []string{name, title, msgs, dur, cost}})
	}
	renderTable(w, headers, rows, widths)
	fmt.Fprintln(w)
}

// --- Shared section renderers ---

func renderConversationSection(w io.Writer, msg *messageReport, usage *usageReport) {
	fmt.Fprintln(w, sectionTitle("Conversation"))

	parts := []string{fmt.Sprintf("%d total", msg.Total)}
	for _, key := range []string{"user", "assistant", "system", "progress"} {
		if n, ok := msg.ByType[key]; ok && n > 0 {
			parts = append(parts, fmt.Sprintf("%d %s", n, key))
		}
	}
	fmt.Fprintln(w, row("Messages", strings.Join(parts, ", ")))

	if msg.First != "" {
		fmt.Fprintln(w, row("First", formatTimestamp(msg.First)))
	}
	if msg.Last != "" {
		fmt.Fprintln(w, row("Last", formatTimestamp(msg.Last)))
	}

	if usage != nil && usage.TotalTokens > 0 {
		tokenStr := fmt.Sprintf("In: %s  Out: %s",
			formatCommas(usage.InputTokens),
			formatCommas(usage.OutputTokens))
		cacheTotal := usage.CacheCreationTokens + usage.CacheReadTokens
		if cacheTotal > 0 {
			tokenStr += fmt.Sprintf("  Cache: %s", formatCommas(cacheTotal))
		}
		fmt.Fprintln(w, row("Tokens", tokenStr))
		fmt.Fprintln(w, row("Cost", formatCost(usage.Cost)))
	}

	fmt.Fprintln(w)
}

func renderInsightsSections(w io.Writer, ins *insightsReport) {
	if len(ins.Tools) > 0 {
		errorCounts := make(map[string]int)
		for _, e := range ins.Errors {
			errorCounts[e.ToolName]++
		}

		fmt.Fprintln(w, sectionTitle("Tool Usage"))
		headers := []string{"Tool", "Calls", "Errors"}
		widths := []int{20, 8, 8}
		var rows []tableRow
		for _, t := range ins.Tools {
			errStr := dim("0")
			if n := errorCounts[t.Name]; n > 0 {
				errStr = red(fmt.Sprintf("%d", n))
			}
			rows = append(rows, tableRow{cols: []string{t.Name, fmt.Sprintf("%d", t.Count), errStr}})
		}
		renderTable(w, headers, rows, widths)
		fmt.Fprintln(w)
	}

	if ins.FilesRead > 0 || len(ins.FilesWritten) > 0 {
		fmt.Fprintln(w, sectionTitle("Files"))
		if ins.FilesRead > 0 {
			fmt.Fprintln(w, row("Read", fmt.Sprintf("%d files", ins.FilesRead)))
		}
		if len(ins.FilesWritten) > 0 {
			fmt.Fprintln(w, row("Written", fmt.Sprintf("%d files", len(ins.FilesWritten))))
			for _, f := range ins.FilesWritten {
				fmt.Fprintln(w, rowIndent("  "+dim(f)))
			}
		}
		fmt.Fprintln(w)
	}

	if len(ins.Errors) > 0 {
		fmt.Fprintln(w, bold(red(fmt.Sprintf("Errors (%d)", len(ins.Errors)))))
		for _, e := range ins.Errors {
			fmt.Fprintln(w, rowIndent(fmt.Sprintf("[%s] %s", bold(e.ToolName), e.Snippet)))
		}
		fmt.Fprintln(w)
	}

	if len(ins.Subagents) > 0 {
		fmt.Fprintln(w, sectionTitle(fmt.Sprintf("Subagents (%d)", len(ins.Subagents))))
		for _, s := range ins.Subagents {
			desc := s.Description
			if desc == "" {
				desc = "(no description)"
			}
			if s.TurnCount > 0 {
				desc += dim(fmt.Sprintf(" (%d turns)", s.TurnCount))
			}
			fmt.Fprintln(w, rowIndent(desc))
		}
		fmt.Fprintln(w)
	}

	if len(ins.Skills) > 0 {
		fmt.Fprintln(w, sectionTitle("Skills"))
		for _, s := range ins.Skills {
			fmt.Fprintln(w, row(s.Name, fmt.Sprintf("%d", s.Count)))
		}
		fmt.Fprintln(w)
	}
}

// --- Verbose sections ---

func renderVerboseLookup(w io.Writer, r *lookupReport) {
	if r.Resolution != nil {
		fmt.Fprintln(w, bold(dim("Resolution")))
		fmt.Fprintln(w, row("Encoded", r.Resolution.EncodedPath))
		fmt.Fprintln(w, row("Expected", redact.MaskHomePath(r.Resolution.ExpectedDir)))
		fmt.Fprintln(w, row("Dir exists", fmt.Sprintf("%t", r.Resolution.DirExists)))
		fmt.Fprintln(w, row("File exists", fmt.Sprintf("%t", r.Resolution.FileExists)))
		fmt.Fprintln(w, row("File path", redact.MaskHomePath(r.Resolution.FilePath)))
		if len(r.Resolution.Candidates) > 0 {
			fmt.Fprintln(w, rowIndent(bold("Candidates:")))
			for _, c := range r.Resolution.Candidates {
				fmt.Fprintln(w, rowIndent("  "+redact.MaskHomePath(c)))
			}
		}
		fmt.Fprintln(w)
	}

	if r.Enrichment != nil {
		fmt.Fprintln(w, bold(dim("Enrichment")))
		fmt.Fprintln(w, row("Success", fmt.Sprintf("%t", r.Enrichment.Success)))
		fmt.Fprintln(w, row("Messages", fmt.Sprintf("%d", r.Enrichment.Messages)))
		if r.Enrichment.Model != "" {
			fmt.Fprintln(w, row("Model", r.Enrichment.Model))
		}
		if r.Enrichment.Slug != "" {
			fmt.Fprintln(w, row("Slug", r.Enrichment.Slug))
		}
		if r.Enrichment.Activity != "" {
			fmt.Fprintln(w, row("Activity", r.Enrichment.Activity))
		}
		fmt.Fprintln(w)
	}
}

func renderParseSection(w io.Writer, p *parseReport) {
	fmt.Fprintln(w, bold(dim("Parse")))
	fmt.Fprintln(w, row("Skipped", fmt.Sprintf("%d lines", p.SkippedLines)))
	if len(p.Samples) > 0 {
		fmt.Fprintln(w, rowIndent(bold("Samples:")))
		for _, s := range p.Samples {
			fmt.Fprintln(w, rowIndent("  "+dim(s)))
		}
	}
	fmt.Fprintln(w)
}
