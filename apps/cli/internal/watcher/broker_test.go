package watcher

import (
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/driangle/vibeview/internal/session"
)

func setupBrokerTestDir(t *testing.T) (string, *session.Index) {
	t.Helper()
	dir := t.TempDir()

	history := `{"sessionId":"sess-1","project":"/users/me/proj","display":"Test","timestamp":1700000000000}` + "\n"
	if err := os.WriteFile(filepath.Join(dir, "history.jsonl"), []byte(history), 0644); err != nil {
		t.Fatal(err)
	}

	projDir := filepath.Join(dir, "projects", "-users-me-proj")
	if err := os.MkdirAll(projDir, 0755); err != nil {
		t.Fatal(err)
	}

	sess := `{"type":"user","uuid":"u1","sessionId":"sess-1","timestamp":1700000000000,"message":{"role":"user","content":[{"type":"text","text":"hello"}]}}` + "\n"
	if err := os.WriteFile(filepath.Join(projDir, "sess-1.jsonl"), []byte(sess), 0644); err != nil {
		t.Fatal(err)
	}

	idx, err := session.Discover(dir, nil)
	if err != nil {
		t.Fatal(err)
	}
	return dir, idx
}

func TestBrokerSubscribeUnsubscribe(t *testing.T) {
	dir, idx := setupBrokerTestDir(t)
	broker, err := NewBroker(dir, idx, false, nil, nil)
	if err != nil {
		t.Fatal(err)
	}
	defer broker.Close()

	client, err := broker.Subscribe("sess-1")
	if err != nil {
		t.Fatal(err)
	}
	broker.Unsubscribe(client)

	// After unsubscribe, tailer should be cleaned up.
	broker.mu.Lock()
	_, hasTailer := broker.tailers["sess-1"]
	_, hasClients := broker.clients["sess-1"]
	broker.mu.Unlock()

	if hasTailer {
		t.Error("expected tailer to be cleaned up after last client unsubscribes")
	}
	if hasClients {
		t.Error("expected client map to be cleaned up")
	}
}

func TestBrokerMultipleClients(t *testing.T) {
	dir, idx := setupBrokerTestDir(t)
	broker, err := NewBroker(dir, idx, false, nil, nil)
	if err != nil {
		t.Fatal(err)
	}
	defer broker.Close()

	c1, err := broker.Subscribe("sess-1")
	if err != nil {
		t.Fatal(err)
	}
	c2, err := broker.Subscribe("sess-1")
	if err != nil {
		t.Fatal(err)
	}

	// Append a new message to trigger events.
	sessPath := filepath.Join(dir, "projects", "-users-me-proj", "sess-1.jsonl")
	f, err := os.OpenFile(sessPath, os.O_APPEND|os.O_WRONLY, 0644)
	if err != nil {
		t.Fatal(err)
	}
	writeLine(t, f, map[string]any{
		"type":      "assistant",
		"uuid":      "a1",
		"timestamp": 2000,
		"message":   map[string]any{"role": "assistant", "content": []any{map[string]any{"type": "text", "text": "hi"}}},
	})
	f.Close()

	// Both clients should receive the event.
	for _, c := range []*Client{c1, c2} {
		select {
		case event := <-c.Events:
			if event.Event != "message" {
				t.Errorf("expected message event, got %s", event.Event)
			}
		case <-time.After(3 * time.Second):
			t.Fatal("timed out waiting for event")
		}
	}

	broker.Unsubscribe(c1)
	broker.Unsubscribe(c2)
}

func TestBrokerHistoryWatcher(t *testing.T) {
	dir, idx := setupBrokerTestDir(t)
	broker, err := NewBroker(dir, idx, false, nil, nil)
	if err != nil {
		t.Fatal(err)
	}
	defer broker.Close()

	initialCount := len(idx.GetSessions())

	// Create a new session file.
	projDir := filepath.Join(dir, "projects", "-users-me-proj")
	newSess := `{"type":"user","uuid":"u2","sessionId":"sess-2","timestamp":1700002000000,"message":{"role":"user","content":[{"type":"text","text":"new session"}]}}` + "\n"
	if err := os.WriteFile(filepath.Join(projDir, "sess-2.jsonl"), []byte(newSess), 0644); err != nil {
		t.Fatal(err)
	}

	// Append a new entry to history.jsonl.
	f, err := os.OpenFile(filepath.Join(dir, "history.jsonl"), os.O_APPEND|os.O_WRONLY, 0644)
	if err != nil {
		t.Fatal(err)
	}
	f.WriteString(`{"sessionId":"sess-2","project":"/users/me/proj","display":"New Session","timestamp":1700002000000}` + "\n")
	f.Sync()
	f.Close()

	// Wait for the watcher to detect the change.
	deadline := time.After(3 * time.Second)
	for {
		count := len(idx.GetSessions())
		if count > initialCount {
			break
		}
		select {
		case <-deadline:
			t.Fatalf("expected new session to be added to index, still have %d sessions", count)
		case <-time.After(50 * time.Millisecond):
		}
	}
}
