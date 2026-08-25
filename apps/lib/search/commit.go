package search

import (
	"bytes"
	"context"
	"fmt"
	"os/exec"
	"path"
	"strconv"
	"strings"
)

// Commit is the subset of a git commit used to locate the sessions that
// produced it. Sessions rarely quote a commit hash, but they do read and write
// the files it touches and discuss the work its subject describes — so the
// changed paths and subject are what make a commit findable.
type Commit struct {
	Hash      string
	ShortHash string
	Subject   string
	Timestamp int64    // Commit date as epoch millis.
	Files     []string // Repo-relative paths changed by the commit.
}

// ResolveCommit reads a commit from the git repository at repoDir. ref is any
// git revision (short hash, full hash, tag, HEAD~2).
//
// Merge commits resolve with no Files, because `git show` reports no diff for
// them by default; their hash, subject, and timestamp still apply.
func ResolveCommit(ctx context.Context, repoDir, ref string) (Commit, error) {
	if strings.TrimSpace(ref) == "" {
		return Commit{}, fmt.Errorf("no commit reference given")
	}

	// %H full hash, %h short hash, %ct commit date (epoch seconds), %s subject.
	meta, err := runGit(ctx, repoDir, "show", "-s", "--format=%H%n%h%n%ct%n%s", ref)
	if err != nil {
		return Commit{}, err
	}
	fields := strings.SplitN(strings.TrimRight(meta, "\n"), "\n", 4)
	if len(fields) < 3 {
		return Commit{}, fmt.Errorf("unexpected git output for %q", ref)
	}

	secs, err := strconv.ParseInt(fields[2], 10, 64)
	if err != nil {
		return Commit{}, fmt.Errorf("parsing commit date for %q: %w", ref, err)
	}

	c := Commit{
		Hash:      fields[0],
		ShortHash: fields[1],
		Timestamp: secs * 1000,
	}
	if len(fields) == 4 {
		c.Subject = fields[3]
	}

	files, err := runGit(ctx, repoDir, "show", "--name-only", "--format=", ref)
	if err != nil {
		return Commit{}, err
	}
	for _, line := range strings.Split(files, "\n") {
		if line = strings.TrimSpace(line); line != "" {
			c.Files = append(c.Files, line)
		}
	}

	return c, nil
}

// runGit runs a git command in repoDir and returns its stdout, folding stderr
// into the error so git's own diagnosis ("unknown revision", "not a git
// repository") reaches the caller.
func runGit(ctx context.Context, repoDir string, args ...string) (string, error) {
	cmd := exec.CommandContext(ctx, "git", append([]string{"-C", repoDir}, args...)...)
	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr
	if err := cmd.Run(); err != nil {
		if msg := strings.TrimSpace(stderr.String()); msg != "" {
			return "", fmt.Errorf("git %s: %s", args[0], msg)
		}
		return "", fmt.Errorf("git %s: %w", args[0], err)
	}
	return stdout.String(), nil
}

// maxSubjectTerms caps how many words of the subject become search terms, so a
// long subject cannot drown out the hash and path terms in coverage ranking.
const maxSubjectTerms = 8

// minSubjectTermLen is the shortest subject word kept as a term. Shorter words
// ("fix", "add", "to") match almost any session and only add noise.
const minSubjectTermLen = 4

// subjectStopwords are words common enough in commit subjects that they say
// nothing about which session produced the commit.
var subjectStopwords = map[string]bool{
	"this": true, "that": true, "with": true, "from": true, "into": true,
	"when": true, "then": true, "than": true, "them": true, "they": true,
	"have": true, "make": true, "makes": true, "made": true, "also": true,
	"more": true, "most": true, "some": true, "only": true, "just": true,
	"here": true, "there": true, "were": true, "what": true, "which": true,
	"code": true, "file": true, "files": true, "test": true, "tests": true,
	"update": true, "updates": true, "updated": true, "change": true,
	"changes": true, "changed": true, "support": true, "using": true,
	"type": true, "types": true, "case": true, "cases": true,
}

// Query renders the commit as a search query for Search: the hash in both
// forms, every changed path (and its basename), and the meaningful words of the
// subject. Each term is quoted so paths stay single terms, letting coverage
// ranking favour the sessions that match the most facets of the commit.
func (c Commit) Query() string {
	var quoted []string
	for _, term := range c.Terms() {
		quoted = append(quoted, `"`+term+`"`)
	}
	return strings.Join(quoted, " ")
}

// Terms returns the distinct, lowercased search terms derived from the commit.
func (c Commit) Terms() []string {
	var terms []string
	seen := make(map[string]bool)
	add := func(s string) {
		// A quote would terminate the term's quoted span in the rendered query.
		s = strings.ToLower(strings.TrimSpace(strings.ReplaceAll(s, `"`, "")))
		if s == "" || seen[s] {
			return
		}
		seen[s] = true
		terms = append(terms, s)
	}

	add(c.Hash)
	add(c.ShortHash)

	// Repo-relative paths match the absolute paths in transcripts as a
	// substring; the basename additionally catches prose that names the file
	// alone ("rewrote search.go").
	for _, f := range c.Files {
		add(f)
		add(path.Base(f))
	}

	kept := 0
	for _, word := range subjectWords(c.Subject) {
		if kept >= maxSubjectTerms {
			break
		}
		if len(word) < minSubjectTermLen || subjectStopwords[word] {
			continue
		}
		if !seen[word] {
			kept++
		}
		add(word)
	}

	return terms
}

// subjectWords splits a commit subject into lowercased words, dropping any
// conventional-commit prefix ("feat(search):") and punctuation.
func subjectWords(subject string) []string {
	if _, rest, found := strings.Cut(subject, ":"); found {
		// Only a real type(scope) prefix — no spaces before the colon.
		if prefix := subject[:len(subject)-len(rest)-1]; !strings.ContainsAny(prefix, " \t") {
			subject = rest
		}
	}
	return strings.FieldsFunc(strings.ToLower(subject), func(r rune) bool {
		return !(r == '_' || r == '-' || r == '.' || r == '/' ||
			(r >= 'a' && r <= 'z') || (r >= '0' && r <= '9'))
	})
}
