// Package search implements full-text content search across session JSONL files.
package search

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"os"
	"strings"
	"sync"

	"github.com/driangle/vibeview/internal/session"
)

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
}

// Search scans session JSONL files for messages containing the query string.
// It returns up to opts.Limit results, searching newest sessions first.
func Search(ctx context.Context, idx *session.Index, opts Options) []Result {
	sessions := idx.GetSessions()
	query := strings.ToLower(opts.Query)
	queryBytes := []byte(query)

	var (
		mu      sync.Mutex
		results []Result
	)

	sem := make(chan struct{}, 8)
	var wg sync.WaitGroup

	for _, meta := range sessions {
		if ctx.Err() != nil {
			break
		}

		mu.Lock()
		done := len(results) >= opts.Limit
		mu.Unlock()
		if done {
			break
		}

		wg.Add(1)
		meta := meta
		go func() {
			defer wg.Done()

			select {
			case sem <- struct{}{}:
				defer func() { <-sem }()
			case <-ctx.Done():
				return
			}

			mu.Lock()
			done := len(results) >= opts.Limit
			mu.Unlock()
			if done {
				return
			}

			r, ok := searchFile(ctx, opts.ClaudeDir, meta, query, queryBytes)
			if !ok {
				return
			}

			mu.Lock()
			if len(results) < opts.Limit {
				results = append(results, r)
			}
			mu.Unlock()
		}()
	}

	wg.Wait()
	return results
}

// contentLine is a minimal struct for extracting text from JSONL lines.
type contentLine struct {
	Type    string `json:"type"`
	Message *struct {
		Content []struct {
			Type string `json:"type"`
			Text string `json:"text"`
		} `json:"content"`
	} `json:"message"`
}

func searchFile(ctx context.Context, claudeDir string, meta session.SessionMeta, query string, queryBytes []byte) (Result, bool) {
	path := session.ResolveFilePath(claudeDir, meta)
	f, err := os.Open(path)
	if err != nil {
		return Result{}, false
	}
	defer f.Close()

	scanner := bufio.NewScanner(f)
	scanner.Buffer(make([]byte, 0, 256*1024), 10*1024*1024)

	for scanner.Scan() {
		if ctx.Err() != nil {
			return Result{}, false
		}

		line := scanner.Bytes()
		// Quick pre-check: only parse lines that are user or assistant messages.
		if !bytes.Contains(line, []byte(`"type":"user"`)) &&
			!bytes.Contains(line, []byte(`"type":"assistant"`)) {
			continue
		}

		var cl contentLine
		if err := json.Unmarshal(line, &cl); err != nil {
			continue
		}
		if cl.Message == nil {
			continue
		}

		for _, block := range cl.Message.Content {
			if block.Type != "text" || block.Text == "" {
				continue
			}
			lower := strings.ToLower(block.Text)
			if !bytes.Contains([]byte(lower), queryBytes) {
				continue
			}
			return Result{
				Meta:    meta,
				Snippet: buildSnippet(block.Text, query, 120),
			}, true
		}
	}

	return Result{}, false
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
