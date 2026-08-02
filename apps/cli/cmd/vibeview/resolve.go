package main

import (
	"fmt"

	"github.com/driangle/vibeview/apps/lib/session"
)

// resolveSessionMeta resolves a session ID to its SessionMeta using the shared
// session index. It tries an exact match first, then falls back to a unique
// prefix match. This is the single lookup path used by both `show` and
// `inspect`, so a given ID (full UUID or 8-char prefix) resolves identically
// across commands.
//
// It returns an error if discovery fails, the prefix is ambiguous, or no
// session matches.
func resolveSessionMeta(claudeDir, target string) (*session.SessionMeta, error) {
	idx, err := session.Discover(claudeDir, nil)
	if err != nil {
		return nil, fmt.Errorf("discovering sessions: %w", err)
	}

	if meta := idx.FindSession(target); meta != nil {
		return meta, nil
	}
	return idx.FindSessionByPrefix(target)
}
