package session

import "testing"

// mockProcessChecker implements ProcessChecker for testing.
type mockProcessChecker struct {
	alive map[string]bool
}

func (m *mockProcessChecker) IsProcessAlive(sessionID string) bool {
	if alive, ok := m.alive[sessionID]; ok {
		return alive
	}
	return true // fail-open by default
}

func TestEnrichWithDeadProcess(t *testing.T) {
	dir := setupTestDir(t)

	idx, err := Discover(dir, nil)
	if err != nil {
		t.Fatal(err)
	}

	checker := &mockProcessChecker{
		alive: map[string]bool{
			"sess-1": false,
			"sess-2": false,
		},
	}
	idx.SetProcessChecker(checker)

	// Enrich all sessions — the checker should force dead ones to idle.
	idx.Enrich(dir)

	for _, s := range idx.GetSessions() {
		if s.ActivityState != ActivityIdle {
			t.Errorf("session %s: expected %q with dead process, got %q", s.SessionID, ActivityIdle, s.ActivityState)
		}
	}
}

func TestEnrichWithNilChecker(t *testing.T) {
	dir := setupTestDir(t)

	idx, err := Discover(dir, nil)
	if err != nil {
		t.Fatal(err)
	}

	// Don't set a process checker — existing behavior should be preserved.
	idx.Enrich(dir)

	sessions := idx.GetSessions()
	if len(sessions) == 0 {
		t.Fatal("expected sessions after enrichment")
	}

	// With nil checker, activity state should be derived from messages only.
	// Both test sessions have old timestamps so they should be idle.
	for _, s := range sessions {
		if s.ActivityState != ActivityIdle {
			t.Errorf("session %s: expected %q with nil checker and old timestamps, got %q",
				s.SessionID, ActivityIdle, s.ActivityState)
		}
	}
}
