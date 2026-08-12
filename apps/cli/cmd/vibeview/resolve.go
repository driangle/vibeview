package main

import (
	"github.com/driangle/vibeview/apps/lib/session"
)

// resolveSessionMeta resolves a session reference to its SessionMeta: an exact
// ID, a unique prefix, or a .jsonl path. This is the single lookup path used by
// `show`, `inspect` and `export` (via the sessionhtml SDK), so a given ID
// resolves identically across commands.
//
// It returns an error if discovery fails, the prefix is ambiguous, or no
// session matches.
func resolveSessionMeta(claudeDir, target string) (*session.SessionMeta, error) {
	resolved, err := session.ResolveTarget(claudeDir, target)
	if err != nil {
		return nil, err
	}
	return &resolved.Meta, nil
}
