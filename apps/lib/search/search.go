// Package search implements full-text content search across session JSONL files.
package search

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"os"
	"sort"
	"strings"
	"sync"

	"github.com/driangle/vibeview/apps/lib/claude"
	"github.com/driangle/vibeview/apps/lib/redact"
	"github.com/driangle/vibeview/apps/lib/session"
)

// globalSem limits the total number of concurrent file-search goroutines
// across all in-flight Search calls to prevent file-descriptor exhaustion.
var globalSem = make(chan struct{}, 16)

// Result holds a matched session and a text snippet around the match.
type Result struct {
	Meta    session.SessionMeta
	Snippet string
}

// Options configures a content search.
type Options struct {
	Query     string
	Limit     int
	ClaudeDir string
	Dirs      []string // If non-empty, only search sessions whose Project matches one of these directories.
}

// Search scans session JSONL files for messages containing the query string.
// It returns up to opts.Limit results, searching newest sessions first.
func Search(ctx context.Context, idx *session.Index, opts Options) []Result {
	sessions := idx.GetSessions()
	if len(opts.Dirs) > 0 {
		filtered := make([]session.SessionMeta, 0, len(sessions))
		for _, sm := range sessions {
			for _, d := range opts.Dirs {
				if strings.Contains(sm.Project, d) {
					filtered = append(filtered, sm)
					break
				}
			}
		}
		sessions = filtered
	}
	query := strings.ToLower(opts.Query)

	// scored pairs a match with its relevance score and the session's original
	// position, so equal-scoring results keep their newest-first ordering.
	type scored struct {
		result Result
		score  int
		order  int
	}

	var (
		mu        sync.Mutex
		collected []scored
		wg        sync.WaitGroup
	)

	for i, meta := range sessions {
		if ctx.Err() != nil {
			break
		}

		wg.Add(1)
		meta := meta
		order := i
		go func() {
			defer wg.Done()

			select {
			case globalSem <- struct{}{}:
				defer func() { <-globalSem }()
			case <-ctx.Done():
				return
			}

			r, score, ok := searchFile(ctx, opts.ClaudeDir, meta, query)
			if !ok {
				return
			}

			mu.Lock()
			collected = append(collected, scored{result: r, score: score, order: order})
			mu.Unlock()
		}()
	}

	wg.Wait()

	// Rank by relevance, then by original (newest-first) order, before truncating.
	sort.Slice(collected, func(i, j int) bool {
		if collected[i].score != collected[j].score {
			return collected[i].score > collected[j].score
		}
		return collected[i].order < collected[j].order
	})

	limit := opts.Limit
	if limit <= 0 || limit > len(collected) {
		limit = len(collected)
	}
	results := make([]Result, 0, limit)
	for _, s := range collected[:limit] {
		results = append(results, s.result)
	}
	return results
}

// Field weights favor human-authored prose over machine text when both a text
// block and a tool payload match, so the snippet and ranking reflect intent.
const (
	weightText       = 3 // user/assistant text blocks (string- or array-form content)
	weightToolInput  = 2 // tool_use inputs: file paths, commands, patterns, written content
	weightToolResult = 1 // tool_result output text
)

// weightedText is one searchable string drawn from a message, tagged with the
// field weight of its source.
type weightedText struct {
	text   string
	weight int
}

// searchFile scans a session's JSONL for the query and returns a snippet plus a
// relevance score (weighted occurrence count across all searchable fields).
func searchFile(ctx context.Context, claudeDir string, meta session.SessionMeta, query string) (Result, int, bool) {
	path, err := session.ResolveFilePath(claudeDir, meta)
	if err != nil {
		return Result{}, 0, false
	}
	f, err := os.Open(path)
	if err != nil {
		return Result{}, 0, false
	}
	defer f.Close()

	scanner := bufio.NewScanner(f)
	scanner.Buffer(make([]byte, 0, 256*1024), 2*1024*1024)

	var (
		score         int
		snippet       string
		snippetWeight int // weight of the field the current snippet came from
	)

	for scanner.Scan() {
		if ctx.Err() != nil {
			return Result{}, 0, false
		}

		line := scanner.Bytes()
		// Quick pre-check: only parse lines that are user or assistant messages.
		if !bytes.Contains(line, []byte(`"type":"user"`)) &&
			!bytes.Contains(line, []byte(`"type":"assistant"`)) {
			continue
		}

		var msg claude.Message
		if err := json.Unmarshal(line, &msg); err != nil || msg.Message == nil {
			continue
		}

		for _, wt := range searchableTexts(&msg) {
			count := strings.Count(strings.ToLower(wt.text), query)
			if count == 0 {
				continue
			}
			score += count * wt.weight
			// Prefer a snippet from the highest-weight field that matched.
			if wt.weight > snippetWeight {
				snippet = redact.RedactSecrets(buildSnippet(wt.text, query, 120))
				snippetWeight = wt.weight
			}
		}
	}

	if score == 0 {
		return Result{}, 0, false
	}
	return Result{Meta: meta, Snippet: snippet}, score, true
}

// searchableTexts extracts every searchable string from a user/assistant
// message: text blocks (string- or array-form content, normalized by the claude
// parser), tool_use inputs, and tool_result output.
func searchableTexts(msg *claude.Message) []weightedText {
	if msg.Message == nil {
		return nil
	}
	var out []weightedText
	for _, block := range msg.Message.Content {
		switch block.Type {
		case "text":
			if block.Text != "" {
				out = append(out, weightedText{text: block.Text, weight: weightText})
			}
		case "tool_use":
			for _, s := range collectStrings(block.Input) {
				out = append(out, weightedText{text: s, weight: weightToolInput})
			}
		case "tool_result":
			for _, s := range collectStrings(block.Content) {
				out = append(out, weightedText{text: s, weight: weightToolResult})
			}
		}
	}
	return out
}

// collectStrings recursively gathers all non-empty string values from an
// arbitrary JSON value (tool inputs and results), so nested fields like
// file_path, command, and pattern are all indexed without a key allowlist.
func collectStrings(v any) []string {
	switch val := v.(type) {
	case string:
		if val == "" {
			return nil
		}
		return []string{val}
	case map[string]any:
		var out []string
		for _, item := range val {
			out = append(out, collectStrings(item)...)
		}
		return out
	case []any:
		var out []string
		for _, item := range val {
			out = append(out, collectStrings(item)...)
		}
		return out
	default:
		return nil
	}
}

// buildSnippet extracts a ~maxLen character window around the first match,
// trimmed to word boundaries with ellipsis.
func buildSnippet(text, query string, maxLen int) string {
	lower := strings.ToLower(text)
	idx := strings.Index(lower, strings.ToLower(query))
	if idx < 0 {
		if len(text) <= maxLen {
			return text
		}
		return text[:maxLen] + "..."
	}

	// Center the window on the match.
	half := (maxLen - len(query)) / 2
	start := idx - half
	if start < 0 {
		start = 0
	}
	end := start + maxLen
	if end > len(text) {
		end = len(text)
		start = end - maxLen
		if start < 0 {
			start = 0
		}
	}

	snippet := text[start:end]

	// Trim to word boundaries.
	if start > 0 {
		if i := strings.IndexByte(snippet, ' '); i >= 0 && i < len(query) {
			snippet = snippet[i+1:]
		}
		snippet = "..." + snippet
	}
	if end < len(text) {
		if i := strings.LastIndexByte(snippet, ' '); i > len(snippet)-len(query) && i >= 0 {
			snippet = snippet[:i]
		}
		snippet = snippet + "..."
	}

	// Collapse whitespace.
	snippet = strings.Join(strings.Fields(snippet), " ")
	return snippet
}
