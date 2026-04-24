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
		StartedAt: "1735689600000",
	})
	writePIDFile(t, sessionsDir, PIDEntry{
		PID:       67890,
		SessionID: "sess-2",
		Cwd:       "/tmp",
		StartedAt: "1735689600000",
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

func TestIsProcessAlive_NoEntry_EmptyDir(t *testing.T) {
	dir := t.TempDir()
	sessionsDir := filepath.Join(dir, "sessions")
	if err := os.MkdirAll(sessionsDir, 0755); err != nil {
		t.Fatal(err)
	}

	c := NewChecker(dir)
	if c == nil {
		t.Fatal("expected non-nil Checker")
	}

	// No PID entries at all — fail-open (return true).
	if !c.IsProcessAlive("nonexistent-session") {
		t.Error("expected fail-open (true) when no PID entries exist")
	}
}

func TestIsProcessAlive_NoEntry_OtherEntriesExist(t *testing.T) {
	dir := t.TempDir()
	sessionsDir := filepath.Join(dir, "sessions")
	if err := os.MkdirAll(sessionsDir, 0755); err != nil {
		t.Fatal(err)
	}

	// Another session has a PID entry, but not the one we're checking.
	writePIDFile(t, sessionsDir, PIDEntry{
		PID:       os.Getpid(),
		SessionID: "other-session",
	})

	c := NewChecker(dir)
	if c == nil {
		t.Fatal("expected non-nil Checker")
	}

	// Entries exist for other sessions but not this one — process has moved on.
	if c.IsProcessAlive("old-session") {
		t.Error("expected false when session has no PID entry but other entries exist")
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

func TestFindSessionByPID_Match(t *testing.T) {
	dir := t.TempDir()
	sessionsDir := filepath.Join(dir, "sessions")
	if err := os.MkdirAll(sessionsDir, 0755); err != nil {
		t.Fatal(err)
	}

	writePIDFile(t, sessionsDir, PIDEntry{
		PID:       os.Getpid(),
		SessionID: "my-session-123",
	})

	id, err := FindSessionByPID(dir, os.Getpid())
	if err != nil {
		t.Fatalf("expected match, got error: %v", err)
	}
	if id != "my-session-123" {
		t.Errorf("expected session ID my-session-123, got %s", id)
	}
}

func TestFindSessionByPID_NoMatch(t *testing.T) {
	dir := t.TempDir()
	sessionsDir := filepath.Join(dir, "sessions")
	if err := os.MkdirAll(sessionsDir, 0755); err != nil {
		t.Fatal(err)
	}

	writePIDFile(t, sessionsDir, PIDEntry{
		PID:       os.Getpid(),
		SessionID: "other-session",
	})

	_, err := FindSessionByPID(dir, 99999)
	if err == nil {
		t.Error("expected error for non-matching PID")
	}
}

func TestFindSessionByPID_StalePID(t *testing.T) {
	if runtime.GOOS == "windows" {
		t.Skip("PID liveness detection is a no-op on Windows")
	}

	dir := t.TempDir()
	sessionsDir := filepath.Join(dir, "sessions")
	if err := os.MkdirAll(sessionsDir, 0755); err != nil {
		t.Fatal(err)
	}

	writePIDFile(t, sessionsDir, PIDEntry{
		PID:       999999999,
		SessionID: "stale-session",
	})

	_, err := FindSessionByPID(dir, 999999999)
	if err == nil {
		t.Error("expected error for stale PID")
	}
}

func TestFindSessionByPID_NoSessionsDir(t *testing.T) {
	dir := t.TempDir()
	_, err := FindSessionByPID(dir, os.Getpid())
	if err == nil {
		t.Error("expected error when sessions dir doesn't exist")
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
