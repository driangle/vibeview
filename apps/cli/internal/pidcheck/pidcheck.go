// Package pidcheck detects whether Claude Code processes are still alive
// by scanning PID files in ~/.claude/sessions/.
package pidcheck

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sync"
	"time"

	"github.com/driangle/vibeview/internal/logutil"
)

// PIDEntry represents a single PID file written by Claude Code.
type PIDEntry struct {
	PID       int         `json:"pid"`
	SessionID string      `json:"sessionId"`
	Cwd       string      `json:"cwd"`
	StartedAt json.Number `json:"startedAt"`
}

// Checker scans PID files and checks process liveness.
// It caches scan results and refreshes on a configurable TTL.
type Checker struct {
	sessionsDir string
	mu          sync.RWMutex
	entries     map[string]PIDEntry // sessionID -> PIDEntry
	lastScan    time.Time
	scanTTL     time.Duration
}

// NewChecker creates a Checker for the given Claude directory.
// Returns nil if the sessions directory does not exist.
func NewChecker(claudeDir string) *Checker {
	dir := filepath.Join(claudeDir, "sessions")
	if _, err := os.Stat(dir); err != nil {
		return nil
	}
	return &Checker{
		sessionsDir: dir,
		entries:     make(map[string]PIDEntry),
		scanTTL:     30 * time.Second,
	}
}

// IsProcessAlive checks whether the Claude Code process for the given session
// is still running. Returns true on any error (fail-open).
func (c *Checker) IsProcessAlive(sessionID string) bool {
	c.mu.RLock()
	stale := time.Since(c.lastScan) > c.scanTTL
	c.mu.RUnlock()

	if stale {
		c.scan()
	}

	c.mu.RLock()
	entry, ok := c.entries[sessionID]
	hasEntries := len(c.entries) > 0
	c.mu.RUnlock()

	if !ok {
		// No PID entry for this session. If we have entries for other sessions,
		// this session's process has moved on (reused for another session) or
		// exited — treat as not alive. If we have no entries at all (scan
		// failed or empty directory), fail-open and assume alive.
		return !hasEntries
	}

	alive, err := isProcessRunning(entry.PID)
	if err != nil {
		return true // fail-open
	}
	return alive
}

// Refresh forces an immediate rescan of the PID files directory.
func (c *Checker) Refresh() {
	c.scan()
}

// FindSessionByPID scans PID files in claudeDir/sessions/ for an entry
// whose PID matches the given pid and whose process is still alive.
// Returns the session ID on match, or an error if no match is found.
func FindSessionByPID(claudeDir string, pid int) (string, error) {
	sessionsDir := filepath.Join(claudeDir, "sessions")
	entries, err := os.ReadDir(sessionsDir)
	if err != nil {
		return "", fmt.Errorf("cannot read sessions dir: %w", err)
	}

	for _, e := range entries {
		if e.IsDir() || filepath.Ext(e.Name()) != ".json" {
			continue
		}
		data, err := os.ReadFile(filepath.Join(sessionsDir, e.Name()))
		if err != nil {
			continue
		}
		var pe PIDEntry
		if err := json.Unmarshal(data, &pe); err != nil {
			continue
		}
		if pe.PID != pid || pe.SessionID == "" {
			continue
		}
		alive, err := isProcessRunning(pe.PID)
		if err != nil || !alive {
			continue
		}
		return pe.SessionID, nil
	}
	return "", fmt.Errorf("no session found for PID %d", pid)
}

func (c *Checker) scan() {
	entries, err := os.ReadDir(c.sessionsDir)
	if err != nil {
		logutil.Debugf("pidcheck: cannot read sessions dir: %v", err)
		return
	}

	result := make(map[string]PIDEntry, len(entries))
	for _, e := range entries {
		if e.IsDir() || filepath.Ext(e.Name()) != ".json" {
			continue
		}
		data, err := os.ReadFile(filepath.Join(c.sessionsDir, e.Name()))
		if err != nil {
			continue
		}
		var pe PIDEntry
		if err := json.Unmarshal(data, &pe); err != nil {
			continue
		}
		if pe.SessionID != "" {
			result[pe.SessionID] = pe
		}
	}

	c.mu.Lock()
	c.entries = result
	c.lastScan = time.Now()
	c.mu.Unlock()
}
