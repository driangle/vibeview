package session

import (
	"fmt"
	"os"
	"path/filepath"
)

// Target is a resolved session reference.
type Target struct {
	Meta SessionMeta
	// BaseDir is the directory reads for this session must stay inside. For a
	// session found by ID that is the Claude directory; for an explicit file it
	// is that file's own directory, since a standalone transcript lives outside
	// ~/.claude but must still not be able to symlink its way elsewhere.
	BaseDir string
}

// ResolveTarget resolves a user-supplied session reference: a session ID (exact
// match, or a unique prefix) or a path to a .jsonl transcript.
//
// It returns an error if discovery fails, the prefix is ambiguous, or nothing
// matches.
func ResolveTarget(claudeDir, target string) (Target, error) {
	if info, err := os.Stat(target); err == nil && !info.IsDir() {
		idx, err := LoadFromPaths([]string{target})
		if err != nil {
			return Target{}, fmt.Errorf("reading %s: %w", target, err)
		}
		sessions := idx.GetSessions()
		if len(sessions) == 0 {
			return Target{}, fmt.Errorf("no session found in %s", target)
		}
		abs, err := filepath.Abs(target)
		if err != nil {
			return Target{}, fmt.Errorf("resolving %s: %w", target, err)
		}
		return Target{Meta: sessions[0], BaseDir: filepath.Dir(abs)}, nil
	}

	idx, err := Discover(claudeDir, nil)
	if err != nil {
		return Target{}, fmt.Errorf("discovering sessions: %w", err)
	}
	if meta := idx.FindSession(target); meta != nil {
		return Target{Meta: *meta, BaseDir: claudeDir}, nil
	}
	meta, err := idx.FindSessionByPrefix(target)
	if err != nil {
		return Target{}, err
	}
	return Target{Meta: *meta, BaseDir: claudeDir}, nil
}
