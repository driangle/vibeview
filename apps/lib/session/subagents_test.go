package session

import (
	"os"
	"path/filepath"
	"testing"
)

// setupSubagentDir writes a session file plus a subagents/ directory containing
// two agent transcripts (with .meta.json sidecars) and returns the claude dir.
func setupSubagentDir(t *testing.T) (string, SessionMeta) {
	t.Helper()
	dir := t.TempDir()

	project := "/Users/me/project-a"
	sessionID := "sess-parent"
	projDir := filepath.Join(dir, "projects", "-Users-me-project-a")
	if err := os.MkdirAll(projDir, 0755); err != nil {
		t.Fatal(err)
	}

	parent := `{"type":"user","uuid":"u1","sessionId":"sess-parent","timestamp":1000,"message":{"role":"user","content":[{"type":"text","text":"do work"}]}}
`
	if err := os.WriteFile(filepath.Join(projDir, sessionID+".jsonl"), []byte(parent), 0644); err != nil {
		t.Fatal(err)
	}

	subDir := filepath.Join(projDir, sessionID, "subagents")
	if err := os.MkdirAll(subDir, 0755); err != nil {
		t.Fatal(err)
	}

	// Agent 1: 3 messages (2 assistant turns), meta with type+description.
	agent1 := `{"type":"user","uuid":"au1","timestamp":2000,"message":{"role":"user","content":[{"type":"text","text":"go"}]}}
{"type":"assistant","uuid":"aa1","timestamp":2001,"message":{"role":"assistant","content":[{"type":"text","text":"a"}]}}
{"type":"assistant","uuid":"aa2","timestamp":2002,"message":{"role":"assistant","content":[{"type":"text","text":"b"}]}}
`
	writeFile(t, filepath.Join(subDir, "agent-aaa111.jsonl"), agent1)
	writeFile(t, filepath.Join(subDir, "agent-aaa111.meta.json"), `{"agentType":"Explore","description":"look at code"}`)

	// Agent 2: 1 message (1 assistant turn), earlier start time so it sorts first.
	agent2 := `{"type":"assistant","uuid":"ba1","timestamp":1500,"message":{"role":"assistant","content":[{"type":"text","text":"c"}]}}
`
	writeFile(t, filepath.Join(subDir, "agent-bbb222.jsonl"), agent2)
	writeFile(t, filepath.Join(subDir, "agent-bbb222.meta.json"), `{"agentType":"general-purpose","description":"other work"}`)

	// A non-agent file that must be ignored.
	writeFile(t, filepath.Join(subDir, "notes.txt"), "ignore me")

	return dir, SessionMeta{SessionID: sessionID, Project: project}
}

func writeFile(t *testing.T, path, content string) {
	t.Helper()
	if err := os.WriteFile(path, []byte(content), 0644); err != nil {
		t.Fatal(err)
	}
}

func TestListSubagents(t *testing.T) {
	dir, meta := setupSubagentDir(t)

	subs, err := ListSubagents(dir, meta)
	if err != nil {
		t.Fatalf("ListSubagents: %v", err)
	}
	if len(subs) != 2 {
		t.Fatalf("expected 2 subagents, got %d", len(subs))
	}

	// Sorted by start time ascending: agent-bbb222 (ts 1500) before agent-aaa111 (ts 2000).
	if subs[0].AgentID != "bbb222" {
		t.Errorf("expected first subagent bbb222, got %s", subs[0].AgentID)
	}
	if subs[0].AgentType != "general-purpose" || subs[0].Description != "other work" {
		t.Errorf("bbb222 meta mismatch: type=%q desc=%q", subs[0].AgentType, subs[0].Description)
	}
	if subs[0].MessageCount != 1 || subs[0].TurnCount != 1 {
		t.Errorf("bbb222 counts: got msgs=%d turns=%d, want 1/1", subs[0].MessageCount, subs[0].TurnCount)
	}

	if subs[1].AgentID != "aaa111" {
		t.Errorf("expected second subagent aaa111, got %s", subs[1].AgentID)
	}
	if subs[1].AgentType != "Explore" || subs[1].Description != "look at code" {
		t.Errorf("aaa111 meta mismatch: type=%q desc=%q", subs[1].AgentType, subs[1].Description)
	}
	if subs[1].MessageCount != 3 || subs[1].TurnCount != 2 {
		t.Errorf("aaa111 counts: got msgs=%d turns=%d, want 3/2", subs[1].MessageCount, subs[1].TurnCount)
	}
}

func TestListSubagentsNoDir(t *testing.T) {
	dir := t.TempDir()
	projDir := filepath.Join(dir, "projects", "-Users-me-project-a")
	if err := os.MkdirAll(projDir, 0755); err != nil {
		t.Fatal(err)
	}
	writeFile(t, filepath.Join(projDir, "sess-x.jsonl"), `{"type":"user","uuid":"u","timestamp":1,"message":{"role":"user","content":[]}}`+"\n")

	subs, err := ListSubagents(dir, SessionMeta{SessionID: "sess-x", Project: "/Users/me/project-a"})
	if err != nil {
		t.Fatalf("ListSubagents with no subagents dir should not error: %v", err)
	}
	if len(subs) != 0 {
		t.Errorf("expected 0 subagents, got %d", len(subs))
	}
}

func TestListSubagentsInvalidSessionID(t *testing.T) {
	if _, err := ListSubagents(t.TempDir(), SessionMeta{SessionID: "../evil", Project: "/p"}); err == nil {
		t.Error("expected error for unsafe session ID")
	}
}
