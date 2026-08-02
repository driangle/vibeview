package main

import (
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/driangle/vibeview/apps/lib/session"
)

// setupRelatedDir builds a claude dir with a target session, one subagent, one
// in-window sibling (same project), one out-of-window sibling (same project),
// and one other-project session. Timestamps are in epoch millis.
func setupRelatedDir(t *testing.T) string {
	t.Helper()
	dir := t.TempDir()

	history := `{"sessionId":"target-1111","project":"/Users/me/proj","display":"target","timestamp":1000000}
{"sessionId":"sib-in-2222","project":"/Users/me/proj","display":"sibling in window","timestamp":1000500}
{"sessionId":"sib-out-3333","project":"/Users/me/proj","display":"sibling out of window","timestamp":9000000}
{"sessionId":"other-4444","project":"/Users/me/elsewhere","display":"other project","timestamp":1000200}
`
	writeTestFile(t, filepath.Join(dir, "history.jsonl"), history)

	projDir := filepath.Join(dir, "projects", "-Users-me-proj")
	if err := os.MkdirAll(projDir, 0755); err != nil {
		t.Fatal(err)
	}
	otherDir := filepath.Join(dir, "projects", "-Users-me-elsewhere")
	if err := os.MkdirAll(otherDir, 0755); err != nil {
		t.Fatal(err)
	}

	// Target: window [1000000, 1002000].
	writeTestFile(t, filepath.Join(projDir, "target-1111.jsonl"),
		`{"type":"user","uuid":"u","sessionId":"target-1111","timestamp":1000000,"message":{"role":"user","content":[{"type":"text","text":"the task"}]}}
{"type":"assistant","uuid":"a","sessionId":"target-1111","timestamp":1002000,"message":{"role":"assistant","content":[{"type":"text","text":"ok"}]}}
`)
	// Sibling in window: starts 500ms after target start.
	writeTestFile(t, filepath.Join(projDir, "sib-in-2222.jsonl"),
		`{"type":"user","uuid":"u","sessionId":"sib-in-2222","timestamp":1000500,"message":{"role":"user","content":[{"type":"text","text":"sibling"}]}}
`)
	// Sibling out of window: hours later.
	writeTestFile(t, filepath.Join(projDir, "sib-out-3333.jsonl"),
		`{"type":"user","uuid":"u","sessionId":"sib-out-3333","timestamp":9000000,"message":{"role":"user","content":[{"type":"text","text":"much later"}]}}
`)
	// Other project (same time as target) — must be excluded by project filter.
	writeTestFile(t, filepath.Join(otherDir, "other-4444.jsonl"),
		`{"type":"user","uuid":"u","sessionId":"other-4444","timestamp":1000200,"message":{"role":"user","content":[{"type":"text","text":"other"}]}}
`)

	// Target subagent.
	subDir := filepath.Join(projDir, "target-1111", "subagents")
	if err := os.MkdirAll(subDir, 0755); err != nil {
		t.Fatal(err)
	}
	writeTestFile(t, filepath.Join(subDir, "agent-xyz.jsonl"),
		`{"type":"assistant","uuid":"s","timestamp":1000100,"message":{"role":"assistant","content":[{"type":"text","text":"sub"}]}}
`)
	writeTestFile(t, filepath.Join(subDir, "agent-xyz.meta.json"), `{"agentType":"Explore","description":"dig in"}`)

	return dir
}

func writeTestFile(t *testing.T, path, content string) {
	t.Helper()
	if err := os.WriteFile(path, []byte(content), 0644); err != nil {
		t.Fatal(err)
	}
}

func TestBuildRelatedByPrefix(t *testing.T) {
	dir := setupRelatedDir(t)

	// Resolve by 8-char prefix.
	res, err := buildRelated(dir, "target-1", relatedOptions{gap: 30 * time.Minute})
	if err != nil {
		t.Fatalf("buildRelated: %v", err)
	}

	if res.target.SessionID != "target-1111" {
		t.Fatalf("target = %s, want target-1111", res.target.SessionID)
	}

	// One subagent with its meta.
	if len(res.subagents) != 1 {
		t.Fatalf("subagents = %d, want 1", len(res.subagents))
	}
	if res.subagents[0].AgentType != "Explore" || res.subagents[0].Description != "dig in" {
		t.Errorf("subagent meta mismatch: %+v", res.subagents[0])
	}

	// Only the in-window, same-project sibling.
	if len(res.siblings) != 1 {
		t.Fatalf("siblings = %v, want just sib-in-2222", siblingIDs(res.siblings))
	}
	if res.siblings[0].SessionID != "sib-in-2222" {
		t.Errorf("sibling = %s, want sib-in-2222", res.siblings[0].SessionID)
	}
}

func TestBuildRelatedGapWidensWindow(t *testing.T) {
	dir := setupRelatedDir(t)

	// A huge gap should pull in the far-away same-project sibling too.
	res, err := buildRelated(dir, "target-1111", relatedOptions{gap: 24 * time.Hour})
	if err != nil {
		t.Fatalf("buildRelated: %v", err)
	}
	if len(res.siblings) != 2 {
		t.Fatalf("siblings = %v, want both same-project siblings", siblingIDs(res.siblings))
	}
}

func TestBuildRelatedFlags(t *testing.T) {
	dir := setupRelatedDir(t)

	noSub, err := buildRelated(dir, "target-1111", relatedOptions{gap: 30 * time.Minute, noSubagents: true})
	if err != nil {
		t.Fatal(err)
	}
	if len(noSub.subagents) != 0 {
		t.Errorf("--no-subagents: got %d subagents, want 0", len(noSub.subagents))
	}

	noSib, err := buildRelated(dir, "target-1111", relatedOptions{gap: 30 * time.Minute, noSiblings: true})
	if err != nil {
		t.Fatal(err)
	}
	if len(noSib.siblings) != 0 {
		t.Errorf("--no-siblings: got %d siblings, want 0", len(noSib.siblings))
	}
}

func TestBuildRelatedJSONShape(t *testing.T) {
	dir := setupRelatedDir(t)
	res, err := buildRelated(dir, "target-1111", relatedOptions{gap: 30 * time.Minute})
	if err != nil {
		t.Fatal(err)
	}

	j := res.toJSON()
	if j.Target.ID != "target-1111" {
		t.Errorf("json target id = %q", j.Target.ID)
	}
	if j.GapMs != (30 * time.Minute).Milliseconds() {
		t.Errorf("json gapMs = %d", j.GapMs)
	}
	if len(j.Subagents) != 1 || j.Subagents[0].AgentID != "xyz" {
		t.Errorf("json subagents = %+v", j.Subagents)
	}
	if len(j.Siblings) != 1 || j.Siblings[0].ID != "sib-in-2222" {
		t.Errorf("json siblings = %+v", j.Siblings)
	}
}

func TestBuildRelatedUnknownSession(t *testing.T) {
	dir := setupRelatedDir(t)
	if _, err := buildRelated(dir, "nope-nope", relatedOptions{gap: time.Minute}); err == nil {
		t.Error("expected error for unknown session")
	}
}

func siblingIDs(sessions []session.SessionMeta) []string {
	ids := make([]string, len(sessions))
	for i, s := range sessions {
		ids[i] = s.SessionID
	}
	return ids
}
