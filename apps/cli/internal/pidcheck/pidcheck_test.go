package pidcheck

import (
	"encoding/json"
	"os"
	"path/filepath"
	"runtime"
	"testing"
)

func writePIDFile(t *testing.T, dir string, entry PIDEntry) {
	t.Helper()
	data, err := json.Marshal(entry)
	if err != nil {
		t.Fatal(err)
	}
	// Use PID as filename, matching Claude Code's convention.
	name := filepath.Join(dir, entry.SessionID+".json")
	if err := os.WriteFile(name, data, 0644); err != nil {
		t.Fatal(err)
	}
}

func TestScanPIDFiles(t *testing.T) {
	dir := t.TempDir()
	sessionsDir := filepath.Join(dir, "sessions")
	if err := os.MkdirAll(sessionsDir, 0755); err != nil {
		t.Fatal(err)
	}

	writePIDFile(t, sessionsDir, PIDEntry{
		PID:       12345,
		SessionID: "sess-1",
		Cwd:       "/tmp",
		StartedAt: "2025-01-01T00:00:00Z",
	})
	writePIDFile(t, sessionsDir, PIDEntry{
		PID:       67890,
		SessionID: "sess-2",
		Cwd:       "/tmp",
		StartedAt: "2025-01-01T00:00:00Z",
	})

	c := NewChecker(dir)
	if c == nil {
		t.Fatal("expected non-nil Checker")
	}

	c.scan()

	c.mu.RLock()
	defer c.mu.RUnlock()
	if len(c.entries) != 2 {
		t.Fatalf("expected 2 entries, got %d", len(c.entries))
	}
	if e, ok := c.entries["sess-1"]; !ok || e.PID != 12345 {
		t.Errorf("expected sess-1 with PID 12345, got %+v", e)
	}
}

func TestIsProcessAlive_NoEntry(t *testing.T) {
	dir := t.TempDir()
	sessionsDir := filepath.Join(dir, "sessions")
	if err := os.MkdirAll(sessionsDir, 0755); err != nil {
		t.Fatal(err)
	}

	c := NewChecker(dir)
	if c == nil {
		t.Fatal("expected non-nil Checker")
	}

	// No PID entry for this session — should fail-open (return true).
	if !c.IsProcessAlive("nonexistent-session") {
		t.Error("expected fail-open (true) for missing session entry")
	}
}

func TestIsProcessAlive_SelfProcess(t *testing.T) {
	dir := t.TempDir()
	sessionsDir := filepath.Join(dir, "sessions")
	if err := os.MkdirAll(sessionsDir, 0755); err != nil {
		t.Fatal(err)
	}

	writePIDFile(t, sessionsDir, PIDEntry{
		PID:       os.Getpid(),
		SessionID: "self-session",
	})

	c := NewChecker(dir)
	if c == nil {
		t.Fatal("expected non-nil Checker")
	}

	if !c.IsProcessAlive("self-session") {
		t.Error("expected current process to be alive")
	}
}

func TestIsProcessAlive_DeadProcess(t *testing.T) {
	if runtime.GOOS == "windows" {
		t.Skip("PID liveness detection is a no-op on Windows")
	}

	dir := t.TempDir()
	sessionsDir := filepath.Join(dir, "sessions")
	if err := os.MkdirAll(sessionsDir, 0755); err != nil {
		t.Fatal(err)
	}

	// Use a very high PID that almost certainly doesn't exist.
	writePIDFile(t, sessionsDir, PIDEntry{
		PID:       999999999,
		SessionID: "dead-session",
	})

	c := NewChecker(dir)
	if c == nil {
		t.Fatal("expected non-nil Checker")
	}

	if c.IsProcessAlive("dead-session") {
		t.Error("expected dead process to return false")
	}
}

func TestNewChecker_NoSessionsDir(t *testing.T) {
	dir := t.TempDir()
	// Don't create sessions subdirectory.
	c := NewChecker(dir)
	if c != nil {
		t.Error("expected nil Checker when sessions dir doesn't exist")
	}
}
