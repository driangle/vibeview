package watcher

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/driangle/vibeview/apps/lib/claude"
	"github.com/driangle/vibeview/apps/lib/messagedto"
	"github.com/driangle/vibeview/apps/lib/session"
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
	if _, err := f.WriteString(`{"sessionId":"sess-2","project":"/users/me/proj","display":"New Session","timestamp":1700002000000}` + "\n"); err != nil {
		t.Fatal(err)
	}
	if err := f.Sync(); err != nil {
		t.Fatal(err)
	}
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

func TestBrokerProjectsPoller(t *testing.T) {
	dir, idx := setupBrokerTestDir(t)
	broker, err := NewBroker(dir, idx, false, nil, nil)
	if err != nil {
		t.Fatal(err)
	}
	defer broker.Close()

	initialCount := len(idx.GetSessions())

	// Create a new session file that is NOT in history.jsonl (SDK-style session).
	sdkProjDir := filepath.Join(dir, "projects", "-users-me-sdk-proj")
	if err := os.MkdirAll(sdkProjDir, 0755); err != nil {
		t.Fatal(err)
	}
	sdkSess := `{"type":"user","uuid":"u3","sessionId":"sdk-sess-1","timestamp":1700003000000,"message":{"role":"user","content":[{"type":"text","text":"SDK session"}]}}` + "\n"
	if err := os.WriteFile(filepath.Join(sdkProjDir, "sdk-sess-1.jsonl"), []byte(sdkSess), 0644); err != nil {
		t.Fatal(err)
	}

	// Wait for the poller to detect the new session (poll interval is 15s, but
	// we can test the underlying mechanism directly).
	for _, meta := range session.ScanProjectDirs(dir, nil) {
		idx.AddSessionMeta(meta)
	}

	newCount := len(idx.GetSessions())
	if newCount <= initialCount {
		t.Fatalf("expected new session to be added, had %d now %d", initialCount, newCount)
	}

	found := idx.FindSession("sdk-sess-1")
	if found == nil {
		t.Error("expected sdk-sess-1 to be in the index")
	}
}

// TestSSEFetchFieldParity guards against the SSE and fetch representations of a
// message drifting apart. messagedto.From is the exact builder the server's
// fetch path (/api/sessions/{id}) uses, and toMessageEvent is the live SSE
// path. A message serialized over SSE must carry every field the fetched
// message carries — the only permitted difference is the live-only
// activityState.
func TestSSEFetchFieldParity(t *testing.T) {
	// Populate the fields that previously diverged between the two paths
	// (content, permissionMode, attachment) alongside the common ones.
	msg := claude.Message{
		UUID:           "msg-1",
		Type:           claude.MessageTypeSystem,
		Timestamp:      claude.Timestamp(1700000000000),
		IsMeta:         true,
		IsSidechain:    true,
		Content:        "system notice",
		PermissionMode: "acceptEdits",
		Attachment:     map[string]any{"kind": "skill"},
		CustomTitle:    "My Title",
		AiTitle:        "Auto Title",
		Data:           map[string]any{"progress": "1/2"},
		Snapshot:       map[string]any{"files": 3},
	}

	fetchKeys := jsonKeys(t, messagedto.From(msg))
	sseKeys := jsonKeys(t, toMessageEvent(msg, "working"))

	// Every field the fetch path emits must also be present over SSE.
	for k, want := range fetchKeys {
		got, ok := sseKeys[k]
		if !ok {
			t.Errorf("SSE payload is missing field %q present in fetch payload", k)
			continue
		}
		if got != want {
			t.Errorf("field %q differs: fetch=%s sse=%s", k, want, got)
		}
	}

	// The only field SSE may add on top of the fetch payload is activityState.
	for k := range sseKeys {
		if k == "activityState" {
			continue
		}
		if _, ok := fetchKeys[k]; !ok {
			t.Errorf("SSE payload has unexpected extra field %q", k)
		}
	}
	if _, ok := sseKeys["activityState"]; !ok {
		t.Error("expected live SSE payload to carry activityState")
	}
}

// jsonKeys marshals v and returns a map of top-level JSON field name to its
// serialized value, so two payloads can be compared field by field.
func jsonKeys(t *testing.T, v any) map[string]string {
	t.Helper()
	data, err := json.Marshal(v)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}
	var raw map[string]json.RawMessage
	if err := json.Unmarshal(data, &raw); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	keys := make(map[string]string, len(raw))
	for k, val := range raw {
		keys[k] = string(val)
	}
	return keys
}
